import express from "express";
import { config } from "../config.js";
import { SYSTEM_PROMPTS } from "../../public/js/config.js";

const router = express.Router();

router.post("/claude", async (req, res) => {
  try {
    const { prompt, exerciseType = "pushups" } = req.body;

    if (!config.claude.apiKey) {
      throw new Error("CLAUDE_API_KEY not configured");
    }

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": config.claude.apiKey,
        "anthropic-version": config.claude.apiVersion,
      },
      body: JSON.stringify({
        model: config.claude.model,
        max_tokens: 50,
        system: SYSTEM_PROMPTS[exerciseType],
        messages: [{ role: "user", content: prompt }],
      }),
    });

    if (!response.ok) {
      throw new Error(`Claude API error: ${response.status}`);
    }

    const data = await response.json();
    res.json(data);
  } catch (error) {
    console.error("Claude API error:", error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
