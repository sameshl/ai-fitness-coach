import dotenv from "dotenv";

dotenv.config();

const requiredEnvVars = ["CLAUDE_API_KEY", "HEYGEN_API_KEY", "VISION_API_KEY"];

requiredEnvVars.forEach((varName) => {
  if (!process.env[varName]) {
    throw new Error(`Missing required environment variable: ${varName}`);
  }
});

export const config = {
  port: process.env.PORT || 4000,
  cors: {
    origin: process.env.CORS_ORIGIN || "*",
    methods: ["GET", "POST"],
  },
  claude: {
    apiKey: process.env.CLAUDE_API_KEY,
    model: "claude-3-sonnet-20240229",
    apiVersion: "2024-02-29",
  },
  vision: {
    endpoint:
      process.env.VISION_API_ENDPOINT ||
      "https://api.openai.com/v1/chat/completions",
    apiVersion: "2024-02-15",
    apiKey: process.env.VISION_API_KEY,
  },
  heygen: {
    apiKey: process.env.HEYGEN_API_KEY,
  },
};
