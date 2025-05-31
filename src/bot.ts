import * as interfaces from "./util/interfaces";
import * as balanceBot from "./bot/balancebot";
import * as rouletteBot from "./bot/roulettebot";
import * as predictionBot from "./bot/predictionbot";
import * as duelBot from './bot/duelbot';
import * as blackjackDuelImpl from "./bot/blackjackduelimpl";
import * as anagramsDuelImpl from './bot/anagramsduelimpl';
import * as funFactsBot from './bot/funfactsbot';
import * as miscBot from './bot/miscbot';
import * as botBase from "./bot/botbase";
import * as userData from "./util/userdata";

import * as fs from "fs";
import * as tg from "telegraf";

// Define configuration options
interface AuthParams {
  username: string;
  bot_token: string;
}
const authPath = "data/private/auth.json";
const auth: AuthParams = JSON.parse(fs.readFileSync(authPath, "utf8"));

function createBot(
  channel: string,
  data: userData.UserData<botBase.PerUserData>
): interfaces.Bot {
  const botContext = new botBase.BotBaseContext("/", auth.username, data);
  const theBot: interfaces.Bot = botBase.composeBotsWithUsernameUpdater(
    [
      (ctx) => new balanceBot.BalanceBot(ctx),
      (ctx) => new rouletteBot.RouletteBot(ctx),
      (ctx) => new predictionBot.PredictionBot(ctx, 100),
      (ctx) =>
        new duelBot.DuelBot(ctx, 0.5, {
          bj: new blackjackDuelImpl.BlackJackDuelImpl(),
          anagrams: new anagramsDuelImpl.AnagramsDuelImpl(
            "data/public/anagrams.json"
          ),
        }),
      (ctx) => new funFactsBot.FunFactsBot(ctx, "data/public/funfacts.json"),
      (ctx) => new miscBot.MiscBot(ctx),
    ],
    botContext
  );

  return theBot;
}

const botManager = new botBase.BotManager(createBot, botBase.createMemoryUserData);
const client = new tg.Telegraf(auth.bot_token);

for (const cmd in createBot("", botBase.createMemoryUserData("")).handlers) {
  console.log(`* register command ${cmd}`);
  client.command(cmd, async (ctx) => {
    const channel = ctx.chat.id.toString();
    const theBot = botManager.getOrCreateBot(channel);
    const selected = theBot.handlers[cmd];

    const username = ctx.from.username;
    console.log(`${username}: ${ctx.message.text}`);

    if (ctx.from.is_bot) {
      // Ignore messages from bots
      return;
    }

    const msg = ctx.message.text.trim();
    const userId = ctx.from.id;
    const chatMember = await ctx.telegram.getChatMember(ctx.chat.id, userId);
    let chatContext = {
      "user-id": userId.toString(),
      username: username,
      mod:
        chatMember.status === "administrator" ||
        chatMember.status === "creator",
    };
    const response = interfaces.callHandler(
      theBot,
      selected,
      chatContext,
      interfaces.splitCommand(msg)
    );
    if (response !== undefined) {
      await ctx.reply(response);
    }
  });
}
client.launch();

// Enable graceful stop
process.once("SIGINT", () => client.stop("SIGINT"));
process.once("SIGTERM", () => client.stop("SIGTERM"));
