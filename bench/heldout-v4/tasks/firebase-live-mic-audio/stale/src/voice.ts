import { getLiveGenerativeModel, ResponseModality, type LiveSession } from "firebase/ai";
import { ai } from "./firebase.ts";

const voiceModel = getLiveGenerativeModel(ai, {
  model: "gemini-live-2.5-flash-preview",
  generationConfig: { responseModalities: [ResponseModality.AUDIO] },
});

/** Opens a voice conversation with the assistant. */
export function connectVoice(): Promise<LiveSession> {
  return voiceModel.connect();
}

/**
 * Streams the user's microphone to the assistant while they talk.
 * `chunks` yields raw 16 kHz, 16-bit little-endian mono PCM, as captured.
 */
export async function streamMicrophone(session: LiveSession, chunks: AsyncIterable<Uint8Array>): Promise<void> {
  for await (const chunk of chunks) {
    await session.sendMediaChunks([
      { mimeType: "audio/pcm;rate=16000", data: Buffer.from(chunk).toString("base64") },
    ]);
  }
}
