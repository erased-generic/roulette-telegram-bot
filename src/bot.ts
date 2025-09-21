import * as interfaces from "./util/interfaces";
import * as botBase from "./bot/botbase";

import * as fs from "fs";
import * as tg from "telegraf";

import './bot/all_bots';

// Define configuration options
interface AuthParams {
  username: string;
  bot_token: string;
}
const authPath = "data/private/auth.json";
const auth: AuthParams = JSON.parse(fs.readFileSync(authPath, "utf8"));

const botManager = new botBase.BotManager(
  botBase.createConfigurableBotFactory(
    auth.username,
    "data/public/config.yaml"
  ),
  botBase.createFileUserData
);
const client = new tg.Telegraf(auth.bot_token);

for (const cmd in botBase.createConfigurableBotFactory(
  "",
  "data/public/config.yaml"
)("", botBase.createMemoryUserData("")).handlers) {
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

client.launch(onConnectedHandler);

process.once("SIGINT", () => doDisconnect("SIGINT"));
process.once("SIGTERM", () => doDisconnect("SIGTERM"));

function onConnectedHandler() {
  console.log("* Connected");
}

function doDisconnect(reason?: string) {
  client.stop(reason);
  console.log("* Disconnected");
}
