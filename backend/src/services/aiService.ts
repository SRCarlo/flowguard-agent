import OpenAI from "openai";

const provider = process.env.AI_PROVIDER || "groq";

const apiKey =
  provider === "groq"
    ? process.env.GROQ_API_KEY
    : process.env.OPENAI_API_KEY;

if (!apiKey) {
  throw new Error(`Missing API key for provider: ${provider}`);
}

const baseURL =
  provider === "groq"
    ? "https://api.groq.com/openai/v1"
    : undefined;

export const aiClient = new OpenAI({
  apiKey,
  baseURL,
});

export const aiModel =
  process.env.AI_MODEL || "openai/gpt-oss-20b";

export { provider };