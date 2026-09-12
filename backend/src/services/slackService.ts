import { App } from "@slack/bolt";

const botToken = process.env.SLACK_BOT_TOKEN;
const appToken = process.env.SLACK_APP_TOKEN;

if (!botToken) {
  throw new Error("Missing SLACK_BOT_TOKEN");
}

if (!appToken) {
  throw new Error("Missing SLACK_APP_TOKEN");
}

console.log("Slack bot token found:", botToken.startsWith("xoxb-"));
console.log("Slack app token found:", appToken.startsWith("xapp-"));

export const slackApp = new App({
  token: botToken,
  appToken,
  socketMode: true,
});
