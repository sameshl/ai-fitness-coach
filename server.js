import express from "express";
import cors from "cors";
import fetch from "node-fetch";
import dotenv from "dotenv";

dotenv.config(); // Load environment variables

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(".")); // Serve static files from current directory

// Proxy endpoint for Claude API
app.post("/api/claude", async (req, res) => {
  try {
    console.log("Received prompt:", req.body.prompt); // Log received prompt

    if (!process.env.CLAUDE_API_KEY) {
      throw new Error("CLAUDE_API_KEY not found in environment variables");
    }

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.CLAUDE_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-3-5-sonnet-20241022",
        max_tokens: 50,
        system: `You are a supportive personal trainer watching someone do pushups from a side view. You're analyzing a 2-second window of movement at 10fps.

Data Explanation:
- Plank alignment: Overall body straightness (180° = perfectly straight)
- Height: Vertical position (higher = up, lower = down)

Response rules:
- Max 3-4 words
- Be generous in plank alignment rules as the user is a beginner
- Give positive feedback for good form
- Only respond for:
  * Completed reps with good form
  * Major form breaks
  * Exceptional form throughout rep
- Don't ever say anything else. If not enough information, say nothing.`,
        messages: [
          {
            role: "user",
            content: req.body.prompt,
          },
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Claude API error response:", errorText);
      throw new Error(`Claude API responded with status ${response.status}`);
    }

    const data = await response.json();
    console.log("Claude API response:", data); // Log Claude's response
    res.json(data);
  } catch (error) {
    console.error("Server error:", error);
    res.status(500).json({ error: error.message });
  }
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log("CLAUDE_API_KEY present:", !!process.env.CLAUDE_API_KEY);
});
