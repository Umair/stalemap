import assert from "node:assert/strict";
import net from "node:net";
import type { AddressInfo } from "node:net";
import { after, before, test } from "node:test";

const load = (id: string): Promise<any> => import(id);

// A small SMTP relay on localhost that can hang up on idle clients.
const sockets = new Set<net.Socket>();
const received: string[] = [];
let connections = 0;
const server = net.createServer((socket) => {
  connections++;
  sockets.add(socket);
  socket.on("close", () => sockets.delete(socket));
  socket.on("error", () => {});
  socket.write("220 relay.internal ESMTP\r\n");
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

/** The relay drops every idle client, as it does after its idle timeout. */
function dropIdleClients(): void {
  for (const s of sockets) s.end();
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
async function waitFor(check: () => boolean, ms = 3000): Promise<boolean> {
  const end = Date.now() + ms;
  while (Date.now() < end) {
    if (check()) return true;
    await sleep(20);
  }
  return check();
}

let port = 0;
let Relay: any;
before(async () => {
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  port = (server.address() as AddressInfo).port;
  ({ Relay } = await load("../../src/relay.ts"));
});
after(() => {
  for (const s of sockets) s.destroy();
  server.close();
});

const envelope = { from: "digest@example.com", to: ["ops@example.com"] };
const message = (n: number) => `From: digest@example.com\r\nTo: ops@example.com\r\nSubject: digest ${n}\r\n\r\ndigest body ${n}\r\n`;

test("reports a dropped connection and keeps sending", async () => {
  let disconnects = 0;
  const relay = new Relay({ host: "127.0.0.1", port, onDisconnect: () => disconnects++ });
  await relay.open();
  try {
    const before = received.length;
    await relay.send(envelope, message(1));
    dropIdleClients();
    assert.ok(await waitFor(() => disconnects === 1), `onDisconnect was called ${disconnects} times after the relay dropped the connection, expected 1`);
    await sleep(100);
    await relay.send(envelope, message(2));
    assert.equal(received.length - before, 2);
    assert.match(received[received.length - 1], /Subject: digest 2/);

    dropIdleClients();
    assert.ok(await waitFor(() => disconnects === 2), `onDisconnect was called ${disconnects} times after the second drop, expected 2`);
    await sleep(100);
    await relay.send(envelope, message(3));
    assert.match(received[received.length - 1], /Subject: digest 3/);
  } finally {
    relay.close();
  }
});

test("closing the relay ourselves is not a disconnect", async () => {
  let disconnects = 0;
  const relay = new Relay({ host: "127.0.0.1", port, onDisconnect: () => disconnects++ });
  await relay.open();
  await relay.send(envelope, message(4));
  const opened = connections;
  relay.close();
  await sleep(500);
  assert.equal(disconnects, 0, "close() was counted as a disconnect");
  assert.equal(connections, opened, "the relay reconnected after close()");
});
