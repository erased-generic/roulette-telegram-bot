import { ChatContext } from "../../src/util/interfaces";
import * as botBase from "../../src/bot/botbase";
import "../../src/bot/all_bots";
import { instanceTestHandler } from "./utils";

const botManager = new botBase.BotManager(
  botBase.createConfigurableBotFactory("test", "data/public/config.yaml"),
  botBase.createMemoryUserData,
);
const instance = botManager.getOrCreateBot("#test");

const aChatContext = { username: "a", "user-id": "a", mod: false };

function testHandler(context: ChatContext, command: string, expected: RegExp) {
  return instanceTestHandler(instance, context, command, expected);
}

testHandler(aChatContext, "/ping", /pong/);
testHandler(aChatContext, "/help", /help/);
testHandler(aChatContext, "/balance", /You have 99 points/);
