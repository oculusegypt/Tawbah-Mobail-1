import { Router, type IRouter } from "express";

const router: IRouter = Router();

const HF_MODEL = "facebook/mms-tts-ara";
const HF_API_URL = `https://api-inference.huggingface.co/models/${HF_MODEL}`;
const MAX_RETRIES = 5;
const RETRY_DELAY_MS = 3000;

async function synthesizeWithHuggingFace(text: string): Promise<Buffer> {
  const apiKey = process.env.HUGGINGFACE_API_KEY;
  if (!apiKey) throw new Error("HUGGINGFACE_API_KEY is not set");

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    const response = await fetch(HF_API_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        Accept: "audio/flac",
      },
      body: JSON.stringify({ inputs: text }),
    });

    if (response.ok) {
      const arrayBuffer = await response.arrayBuffer();
      return Buffer.from(arrayBuffer);
    }

    if (response.status === 503) {
      const body = (await response.json().catch(() => ({}))) as { estimated_time?: number };
      const waitMs = body.estimated_time
        ? Math.ceil(body.estimated_time) * 1000
        : RETRY_DELAY_MS;
      console.log(`[TTS] Model loading, waiting ${waitMs}ms (attempt ${attempt + 1}/${MAX_RETRIES})`);
      await new Promise((r) => setTimeout(r, waitMs));
      continue;
    }

    const errText = await response.text().catch(() => response.statusText);
    throw new Error(`HuggingFace TTS failed (${response.status}): ${errText}`);
  }

  throw new Error("HuggingFace TTS: model did not become ready in time");
}

router.post("/tts", async (req, res) => {
  try {
    const { hadith, note, story, lesson, type } = req.body as {
      hadith?: string;
      note?: string;
      story?: string;
      lesson?: string;
      type?: "hadith" | "story";
    };

    let userText: string;

    if (type === "story" && story) {
      userText = lesson ? `${story}\n\nالعبرة: ${lesson}` : story;
    } else if (hadith) {
      userText = note ? `${hadith}\n\n${note}` : hadith;
    } else {
      res.status(400).json({ error: "text content is required" });
      return;
    }

    const audioBuffer = await synthesizeWithHuggingFace(userText);

    res.setHeader("Content-Type", "audio/flac");
    res.setHeader("Content-Length", audioBuffer.length);
    res.setHeader("Cache-Control", "public, max-age=86400");
    res.send(audioBuffer);
  } catch (err) {
    console.error("TTS error:", err);
    res.status(500).json({ error: "Failed to generate audio" });
  }
});

export default router;
