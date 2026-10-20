import assert from "node:assert/strict";
import { after, test } from "node:test";
import { disableNetwork, doc, getDocFromCache, setDoc, terminate, Timestamp, type Firestore } from "firebase/firestore";

const load = (id: string): Promise<any> => import(id);
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

let db: Firestore | undefined;
after(async () => {
  if (db) await terminate(db);
});

// Firestore runs offline here: writes apply to the local cache (latency compensation) and are never acknowledged,
// so the functions under test are started but not awaited, and the result is read back from the cache.
test("changing a role keeps the rest of the team document", async () => {
  ({ db } = await load("../../src/firebase.ts"));
  await disableNetwork(db!);
  const teams = await load("../../src/teams.ts");
  const ref = doc(db!, "teams", "t-42");
  const seed = {
    name: "Platform",
    members: {
      u1: { role: "member", joinedAt: Timestamp.fromMillis(1_700_000_000_000) },
      u2: { role: "owner", joinedAt: Timestamp.fromMillis(1_600_000_000_000) },
    },
    lastActive: { u1: Timestamp.fromMillis(1_750_000_000_000), u2: Timestamp.fromMillis(1_760_000_000_000) },
    points: { u1: 120, u2: 340 },
  };
  void setDoc(ref, seed).catch(() => {});
  let failure: unknown;
  void Promise.resolve()
    .then(() => teams.setMemberRole("t-42", "u1", "admin"))
    .catch((err: unknown) => (failure = err));

  let data: any;
  for (let i = 0; i < 100; i++) {
    await sleep(20);
    if (failure) break;
    data = (await getDocFromCache(ref)).data();
    if (data?.members?.u1?.role === "admin") break;
  }
  assert.equal(failure, undefined, `setMemberRole failed: ${failure}`);
  assert.equal(data?.members?.u1?.role, "admin", "u1's role wasn't changed");
  assert.ok(data.members.u1.joinedAt?.isEqual(seed.members.u1.joinedAt), "u1's joinedAt was lost");
  assert.equal(data.members.u2.role, "owner", "u2 was changed");
  assert.ok(data.members.u2.joinedAt?.isEqual(seed.members.u2.joinedAt), "u2's joinedAt was lost");
  assert.equal(data.name, "Platform");
  assert.ok(data.lastActive.u1.isEqual(seed.lastActive.u1) && data.lastActive.u2.isEqual(seed.lastActive.u2), "lastActive was changed");
  assert.deepEqual(data.points, { u1: 120, u2: 340 }, "points were changed");
});
