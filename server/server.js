import express from "express";
import cors from "cors";
import { config } from "./config.js";
import claudeRouter from "./routes/claude.js";
import visionRouter from "./routes/vision.js";

const app = express();

app.use(cors(config.cors));
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));
app.use(express.static("public"));

app.use("/api", claudeRouter);
app.use("/api", visionRouter);

process.on("uncaughtException", (error) => {
  console.error("Uncaught Exception:", error);
  process.exit(1);
});

process.on("unhandledRejection", (reason, promise) => {
  console.error("Unhandled Rejection at:", promise, "reason:", reason);
  process.exit(1);
});

app.listen(config.port, () => {
  console.log(`Server running on port ${config.port}`);
  console.log("Environment:", process.env.NODE_ENV);
});
