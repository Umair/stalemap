import assert from "node:assert/strict";
import net from "node:net";
import type { AddressInfo } from "node:net";
import { after, test } from "node:test";

const load = (id: string): Promise<any> => import(id);
const servers: net.Server[] = [];
const received: string[] = [];

/** A local SMTP relay that waits `greetAfterMs` before its greeting, or never greets when it is null. */
async function relay(greetAfterMs: number | null): Promise<number> {
  const server = net.createServer((socket) => {
    socket.on("error", () => {});
    if (greetAfterMs !== null) setTimeout(() => !socket.destroyed && socket.write("220 relay.internal ESMTP\r\n"), greetAfterMs);
    let buf = "";
    let inData = false;
    let body: string[] = [];
    socket.on("data", (chunk) => {
      buf += chunk.toString("utf8");
      let i: number;
      while ((i = buf.indexOf("\r\n")) >= 0) {
        const line = buf.slice(0, i);
        buf = buf.slice(i + 2);
        if (inData) {
          if (line === ".") {
            inData = false;
            received.push(body.join("\n"));
            body = [];
            socket.write("250 2.0.0 queued\r\n");
          } else body.push(line);
        } else if (/^(EHLO|HELO)/i.test(line)) socket.write("250-relay.internal\r\n250 8BITMIME\r\n");
        else if (/^DATA/i.test(line)) {
          inData = true;
          socket.write("354 go ahead\r\n");
        } else if (/^QUIT/i.test(line)) socket.end("221 bye\r\n");
        else socket.write("250 ok\r\n");
      }
    });
  });
  servers.push(server);
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  return (server.address() as AddressInfo).port;
}

after(() => {
  for (const s of servers) {
    s.close();
    (s as any).closeAllConnections?.();
  }
});

test("alerts go through a relay that pauses 3 seconds before greeting", async () => {
  const { createMailer, sendAlert } = await load("../../src/mailer.ts");
  const port = await relay(3_000);
  const mailer = createMailer("127.0.0.1", port);
  try {
    await sendAlert(mailer, "disk almost full", "db-2 is at 91%");
  } finally {
    mailer.close();
  }
  assert.ok(received.some((m) => /Subject: disk almost full/.test(m)), "the relay did not receive the alert");
});

test("a relay that never greets fails within 10 seconds", async () => {
  const { createMailer, sendAlert } = await load("../../src/mailer.ts");
  const port = await relay(null);
  const mailer = createMailer("127.0.0.1", port);
  const started = Date.now();
  const outcome = await Promise.race([
    sendAlert(mailer, "silent relay", "x").then(
      () => "sent",
      () => "failed",
    ),
    new Promise((r) => setTimeout(() => r("still waiting"), 11_500)),
  ]);
  mailer.close();
  assert.equal(outcome, "failed", `after ${((Date.now() - started) / 1000).toFixed(1)} s the send was ${outcome}`);
});
