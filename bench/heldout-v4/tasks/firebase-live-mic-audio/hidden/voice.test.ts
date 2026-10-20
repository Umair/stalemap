import assert from "node:assert/strict";
import { after, test } from "node:test";

const load = (id: string): Promise<any> => import(id);

/** Stands in for the Live API's WebSocket endpoint: completes the handshake and records every client message. */
const sent: any[] = [];
class FakeLiveSocket extends EventTarget {
  static CONNECTING = 0;
  static OPEN = 1;
  static CLOSING = 2;
  static CLOSED = 3;
  readyState = 0;
  binaryType = "blob";
  constructor(readonly url: string) {
    super();
    setTimeout(() => {
      this.readyState = 1;
      this.dispatchEvent(new Event("open"));
    }, 0);
  }
  send(data: string) {
    const message = JSON.parse(data);
    sent.push(message);
    if (message.setup) setTimeout(() => this.reply({ setupComplete: {} }), 0);
  }
  close() {
    if (this.readyState >= 2) return;
    this.readyState = 3;
    const event = Object.assign(new Event("close"), { code: 1000, reason: "" });
    setTimeout(() => this.dispatchEvent(event), 0);
  }
  private reply(body: unknown) {
    this.dispatchEvent(new MessageEvent("message", { data: JSON.stringify(body) }));
  }
}
(globalThis as any).WebSocket = FakeLiveSocket;

let session: any;
after(async () => {
  await session?.close();
});

/** Audio blobs the client sent, in order, whichever realtime-input form carried them. */
function sentAudio(): { mimeType: string; data: string }[] {
  const blobs: { mimeType: string; data: string }[] = [];
  for (const m of sent) {
    const input = m.realtimeInput;
    if (!input) continue;
    if (input.audio) blobs.push(input.audio);
    for (const chunk of input.mediaChunks ?? []) blobs.push(chunk);
  }
  return blobs;
}

test("microphone audio reaches the live session in order", async () => {
  const voice = await load("../../src/voice.ts");
  session = await voice.connectVoice();
  const frames = [0, 1, 2, 3].map((n) => Uint8Array.from({ length: 640 }, (_, i) => (i * 7 + n * 31) % 256));
  async function* microphone() {
    for (const frame of frames) {
      await new Promise((r) => setTimeout(r, 2));
      yield frame;
    }
  }
  await voice.streamMicrophone(session, microphone());
  await new Promise((r) => setTimeout(r, 20));
  const audio = sentAudio();
  assert.ok(audio.length > 0, "no audio was sent to the live session");
  for (const blob of audio) assert.match(blob.mimeType, /^audio\/pcm/, "audio is sent as PCM");
  const received = Buffer.concat(audio.map((b) => Buffer.from(b.data, "base64")));
  assert.ok(received.equals(Buffer.concat(frames)), "the session didn't receive exactly the microphone audio, in order");
});
