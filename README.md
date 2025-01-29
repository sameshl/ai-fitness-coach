# AI Fitness Coach

An interactive fitness coaching application that uses AI to provide real-time feedback on exercise form.



https://github.com/user-attachments/assets/90697616-0cac-4b28-8092-92bc653d5522



## Features

- Real-time pose detection and analysis
- AI-powered exercise form feedback
- Support for multiple exercises (push-ups, bicep curls)
- Video recording and playback
- Calorie tracking with computer vision
- Interactive AI coach using HeyGen

## Setup

1. Clone the repository
2. Copy `.env.example` to `.env` and fill in your API keys
3. Install dependencies:
   ```bash
   npm install
   ```
4. Start the server:
   ```bash
   npm start
   ```
5. Open http://localhost:4000 in your browser

## Environment Variables

- `CLAUDE_API_KEY`: Your Anthropic Claude API key
- `PORT`: Server port (default: 4000)
- `HEYGEN_API_KEY`: Your HeyGen API key
- `VISION_API_KEY`: Your OpenAI/Azure Vision API key
- `VISION_API_ENDPOINT`: Vision API endpoint (optional)

## Technologies Used

- TensorFlow.js for pose detection
- Claude API for exercise analysis
- HeyGen for AI avatar interaction
- Express.js backend
- LiveKit for real-time streaming

## License

MIT
