import * as interfaces from "./util/interfaces";
import * as balanceBot from "./bot/balancebot";
import * as rouletteBot from "./bot/roulettebot";
import * as predictionBot from "./bot/predictionbot";
import * as blackjackDuelBot from "./bot/blackjackduelbot";
import * as funFactsBot from "./bot/funfactsbot";
import * as botBase from "./bot/botbase";
import * as userDataModule from "./util/userdata";

import * as fs from "fs";
import * as tg from "telegraf";

// Define configuration options
interface AuthParams {
  username: string;
  bot_token: string;
}
const authPath = "data/auth.json";
const auth: AuthParams = JSON.parse(fs.readFileSync(authPath, "utf8"));

const userData = new userDataModule.FileUserData<botBase.PerUserData>(
  botBase.onReadUserData,
  "data/table.json"
);
const botContext = new botBase.BotBaseContext("/", auth.username, userData);
const theBot: interfaces.Bot = botBase.composeBotsWithUsernameUpdater(
  [
    (ctx) => new balanceBot.BalanceBot(ctx),
    (ctx) => new rouletteBot.RouletteBot(ctx),
    (ctx) => new predictionBot.PredictionBot(ctx, 100),
    (ctx) => new blackjackDuelBot.BlackJackDuelBot(ctx),
    (ctx) => new funFactsBot.FunFactsBot(ctx, "data/funfacts.json"),
  ],
  botContext
);

const client = new tg.Telegraf(auth.bot_token);

for (const cmd in theBot.handlers) {
  console.log(`* register command ${cmd}`);
  client.command(cmd, async (ctx) => {
    const username = ctx.from.username;
    console.log(`${username}: ${ctx.message.text}`);

    if (ctx.from.is_bot) {
      // Ignore messages from bots
      return;
    }

    const msg = ctx.message.text.trim();
    const selected = interfaces.selectHandler(theBot, msg);
    if (selected === undefined) {
      return;
    }

    if (selected.handler === undefined) {
      console.log(`* ${username} Unknown command ${msg}`);
      return;
    }

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
      selected.handler,
      chatContext,
      selected.args
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
