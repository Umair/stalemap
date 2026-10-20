import { getLiveGenerativeModel, ResponseModality, type GenerativeContentBlob, type LiveSession } from "firebase/ai";
import { ai } from "./firebase.ts";

const voiceModel = getLiveGenerativeModel(ai, {
  model: "gemini-live-2.5-flash-preview",
  generationConfig: { responseModalities: [ResponseModality.AUDIO] },
});

/** Opens a voice conversation with the assistant. */
export function connectVoice(): Promise<LiveSession> {
  return voiceModel.connect();
}

const SAMPLE_RATE = 16_000;
const toBlob = (bytes: Uint8Array): GenerativeContentBlob => ({
  mimeType: `audio/pcm;rate=${SAMPLE_RATE}`,
  data: Buffer.from(bytes.buffer, bytes.byteOffset, bytes.byteLength).toString("base64"),
});

/**
 * Streams the user's microphone to the assistant while they talk.
 * `chunks` yields raw 16 kHz, 16-bit little-endian mono PCM, as captured.
 */
export async function streamMicrophone(session: LiveSession, chunks: AsyncIterable<Uint8Array>): Promise<void> {
  const pending: Promise<void>[] = [];
  for await (const chunk of chunks) {
    if (chunk.byteLength === 0) continue;
    pending.push(session.sendAudioRealtime(toBlob(chunk)));
  }
  await Promise.all(pending);
}
