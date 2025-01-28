import express from "express";
import cors from "cors";
import fetch from "node-fetch";
import dotenv from "dotenv";

dotenv.config(); // Load environment variables

const app = express();
app.use(cors());
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));
app.use(express.static(".")); // Serve static files from current directory

// Update the system prompt to handle both exercises
const getSystemPrompt = (exerciseType) => {
  const prompts = {
    pushups: `You are a supportive personal trainer watching someone do pushups from a side view. You're analyzing a 2-second window of movement at 10fps.

Data Explanation:
- Plank alignment: Overall body straightness (180° = perfectly straight)
- Height: Vertical position (higher = up, lower = down)

Response rules:
- Max 3-4 words
- Be generous in plank alignment rules as the user is a beginner
- Give positive feedback for good form
- Only respond when you see:
  * Completed reps with good form
  * Major form breaks
  * Exceptional form throughout rep
- Remain completely silent in all other cases
- Never explain lack of data or uncertainty`,

    bicepCurls: `You are a supportive personal trainer watching someone do bicep curls from a front view. You're analyzing a 2-second window of movement at 10fps.

Data Explanation:
- Arm angles: Angle between shoulder, elbow, and wrist (180° = straight arm, 30° = full curl)
- Arm tuck: Distance between elbow and body (lower = better form)

Response rules:
- Max 3-4 words
- Focus on:
  * Keeping elbows tucked
  * Full range of motion
  * Symmetric movement
- Give positive feedback for good form
- Only respond when you see:
  * Completed reps with good form
  * Major form breaks
  * Exceptional form
- Remain completely silent in all other cases
- Never explain lack of data or uncertainty`,
  };

  return prompts[exerciseType] || prompts.pushups;
};

// Update the Claude API endpoint
app.post("/api/claude", async (req, res) => {
  try {
    console.log("Received prompt:", req.body.prompt);
    const exerciseType = req.body.exerciseType || "pushups";

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
        system: getSystemPrompt(exerciseType),
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

app.post("/api/vision", async (req, res) => {
  try {
    console.log("Received vision request");

    const response = await fetch(
      "https://wingmanopenai.openai.azure.com/openai/deployments/gpt-4/chat/completions?api-version=2024-05-01-preview",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "api-key": "26b75f033c704063a483d5d2c459833b",
        },
        body: JSON.stringify({
          messages: [
            {
              role: "system",
              content: "Provide only brief responses, maximum 5 words.",
            },
            {
              role: "user",
              content: [
                {
                  type: "text",
                  text: req.body.prompt,
                },
                {
                  type: "image_url",
                  image_url: {
                    url: `data:image/jpeg;base64,${req.body.image}`,
                  },
                },
              ],
            },
          ],
          max_tokens: 50,
          temperature: 0.7,
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error("GPT-4 Vision API error response:", errorText);
      throw new Error(
        `GPT-4 Vision API responded with status ${response.status}`
      );
    }

    const data = await response.json();
    console.log("GPT-4 Vision API response:", data);
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
