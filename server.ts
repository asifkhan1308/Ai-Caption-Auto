import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

// Set up JSON body parser with increased limit for audio uploads
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

// Shared Gemini Client Helper (Lazy Initialized to prevent startup crashes)
let aiClient: GoogleGenAI | null = null;

function getGeminiClient(): GoogleGenAI {
  if (aiClient) return aiClient;

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY environment variable is required. Please set it in Settings > Secrets.");
  }

  aiClient = new GoogleGenAI({
    apiKey: apiKey,
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-build",
      },
    },
  });

  return aiClient;
}

// API Route for Audio Transcription using Gemini 3.5 Flash
app.post("/api/transcribe", async (req, res) => {
  try {
    const { audio, mimeType, promptContext } = req.body;

    if (!audio) {
      return res.status(400).json({ error: "No audio data provided." });
    }

    let resolvedMimeType = mimeType || "audio/mp3";
    // Sanitize MIME type (remove charset if appended)
    if (resolvedMimeType.includes(";")) {
      resolvedMimeType = resolvedMimeType.split(";")[0].trim();
    }

    const ai = getGeminiClient();

    const audioPart = {
      inlineData: {
        mimeType: resolvedMimeType,
        data: audio,
      },
    };

    const promptText = `
You are an advanced, high-precision audio transcription model specializing in auto-caption generation for social media (Shorts, Reels, TikToks).
Transcribe the provided audio into highly accurate word-level or short phrase-level timestamps.

Guidelines:
1. Transcribe the spoken text exactly as heard.
2. Support multilingual speech, specifically English, Hindi, and Hinglish (mixed English and Hindi written in the Latin alphabet).
3. Insert relevant, expressive emojis naturally at key emphatic words to increase visual engagement (e.g., "editing is crazy! 🔥").
4. Split the transcription into single words or very short phrases (1-2 words per element max) to create dynamic, punchy subtitle timings (suitable for fast-paced vertical video editing).
5. For each element, specify precise 'start' and 'end' timestamps in seconds (as floats, e.g., 1.45).
6. Ensure that the 'start' and 'end' timings represent when each word is spoken.

You MUST return a JSON array of caption objects matching this schema:
[
  {
    "text": "bhai",
    "start": 0.0,
    "end": 0.45
  },
  {
    "text": "this",
    "start": 0.45,
    "end": 0.72
  },
  {
    "text": "editing 🔥",
    "start": 0.72,
    "end": 1.15
  }
]

Additional user request details: ${promptContext || "No additional context."}
`;

    // High resiliency: retry transient Gemini API errors (e.g., 503 high demand or 429 rate limit)
    let response;
    let attempt = 0;
    const maxRetries = 3;
    const baseDelayMs = 2000;

    while (true) {
      try {
        response = await ai.models.generateContent({
          model: "gemini-3.5-flash",
          contents: [
            audioPart,
            { text: promptText }
          ],
          config: {
            responseMimeType: "application/json",
            responseSchema: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  text: {
                    type: Type.STRING,
                    description: "The word or short 1-2 word phrase transcribed, optionally with an emoji.",
                  },
                  start: {
                    type: Type.NUMBER,
                    description: "Start timestamp in seconds.",
                  },
                  end: {
                    type: Type.NUMBER,
                    description: "End timestamp in seconds.",
                  },
                },
                required: ["text", "start", "end"],
              },
            },
            temperature: 0.2, // Lower temperature for more accurate and aligned timestamps
          },
        });
        break; // Success, break retry loop!
      } catch (err: any) {
        attempt++;
        const errMsg = String(err.message || err);
        const isTransient = 
          err.status === "UNAVAILABLE" || 
          err.status === 503 ||
          err.status === 429 ||
          errMsg.includes("503") ||
          errMsg.includes("UNAVAILABLE") ||
          errMsg.includes("429") ||
          errMsg.includes("RESOURCE_EXHAUSTED") ||
          errMsg.includes("high demand") ||
          errMsg.includes("temporary");

        if (isTransient && attempt < maxRetries) {
          const delay = baseDelayMs * Math.pow(2, attempt - 1);
          console.warn(`Gemini API returned transient error (attempt ${attempt}/${maxRetries}): ${errMsg}. Retrying in ${delay}ms...`);
          await new Promise((resolve) => setTimeout(resolve, delay));
          continue;
        }
        throw err; // Permanent error or out of retries
      }
    }

    const responseText = response.text;
    if (!responseText) {
      throw new Error("Empty response from Gemini transcription service.");
    }

    // Parse and respond with the JSON transcript
    const transcript = JSON.parse(responseText.trim());
    res.json({ transcript });

  } catch (error: any) {
    console.error("Transcription error:", error);
    res.status(500).json({
      error: error.message || "An error occurred during audio transcription.",
      details: error.stack || ""
    });
  }
});

// Health check endpoint
app.get("/api/health", (req, res) => {
  res.json({ status: "healthy", time: new Date() });
});

async function startServer() {
  // Vite integration for dev server
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
    console.log("Vite development middleware loaded.");
  } else {
    // Serve production static assets
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
    console.log("Serving production static assets from:", distPath);
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running at http://0.0.0.0:${PORT} in ${process.env.NODE_ENV || "development"} mode`);
  });
}

startServer().catch((err) => {
  console.error("Failed to start server:", err);
});
