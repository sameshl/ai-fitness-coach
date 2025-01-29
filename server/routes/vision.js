import express from "express";
import { config } from "../config.js";

const router = express.Router();

router.post("/vision", async (req, res) => {
  try {
    console.log("Received vision request");

    if (!config.vision.apiKey) {
      throw new Error("VISION_API_KEY not configured");
    }

    const response = await fetch(config.vision.endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "api-key": config.vision.apiKey,
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
              { type: "text", text: req.body.prompt },
              {
                type: "image_url",
                image_url: { url: `data:image/jpeg;base64,${req.body.image}` },
              },
            ],
          },
        ],
        max_tokens: 50,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      throw new Error(`Vision API error: ${response.status}`);
    }

    const data = await response.json();
    res.json(data);
  } catch (error) {
    console.error("Vision API error:", error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
