/**
 * Higgsfield 生成ジョブ照会チケットと状態正規化のテスト。
 * Run: npx --yes tsx scripts/test-higgsfield-ticket.ts
 */

import {
  createTicket,
  describeHiggsfieldFailure,
  normalizeHiggsfieldStatus,
  TICKET_TTL_MS,
  verifyTicket,
  type VideoJobTicket,
} from "../src/lib/higgsfield/ticket";

function assert(cond: boolean, msg: string) {
  if (!cond) throw new Error(msg);
  console.log(`  ✓ ${msg}`);
}

const SECRET = "test-secret";
const NOW = 1_800_000_000_000;
const job: VideoJobTicket = {
  request_id: "req_123",
  user_id: "user-a",
  model: "bytedance/seedance-2.5/text-to-video",
  duration_sec: 5,
  aspect_ratio: "16:9",
  sound: true,
  issued_at: NOW,
};

console.log("\n=== ticket ===");
const ticket = createTicket(job, SECRET);
const ok = verifyTicket(ticket, SECRET, "user-a", NOW + 1000);
assert(ok.ok && ok.job.request_id === "req_123", "valid ticket round-trips");

const other = verifyTicket(ticket, SECRET, "user-b", NOW);
assert(!other.ok && other.reason === "user_mismatch", "another user cannot use the ticket");

const wrongSecret = verifyTicket(ticket, "other-secret", "user-a", NOW);
assert(!wrongSecret.ok && wrongSecret.reason === "signature", "ticket signed with another secret is rejected");

const [payload, sig] = ticket.split(".");
const forgedPayload = Buffer.from(JSON.stringify({ ...job, user_id: "user-b" })).toString("base64url");
const forged = verifyTicket(`${forgedPayload}.${sig}`, SECRET, "user-b", NOW);
assert(!forged.ok && forged.reason === "signature", "payload tampering is detected");

const truncated = verifyTicket(`${payload}.${sig.slice(0, -2)}`, SECRET, "user-a", NOW);
assert(!truncated.ok && truncated.reason === "signature", "truncated signature is rejected");

const expired = verifyTicket(ticket, SECRET, "user-a", NOW + TICKET_TTL_MS + 1);
assert(!expired.ok && expired.reason === "expired", "expired ticket is rejected");

for (const bad of ["", "abc", "a.b.c", "."]) {
  const r = verifyTicket(bad, SECRET, "user-a", NOW);
  assert(!r.ok, `malformed ticket ${JSON.stringify(bad)} is rejected`);
}

console.log("\n=== status ===");
assert(normalizeHiggsfieldStatus("completed") === "completed", "completed");
assert(normalizeHiggsfieldStatus("Queued") === "queued", "queued (case-insensitive)");
assert(normalizeHiggsfieldStatus(undefined) === "queued", "missing status treated as queued");
assert(normalizeHiggsfieldStatus("in_progress") === "in_progress", "in_progress");
for (const s of ["failed", "nsfw", "canceled", "cancelled"]) {
  assert(normalizeHiggsfieldStatus(s) === "failed", `${s} -> failed`);
}
assert(describeHiggsfieldFailure("nsfw").includes("安全性"), "nsfw has a specific message");
assert(describeHiggsfieldFailure("failed", "x".repeat(1000)).length < 330, "failure detail is truncated");

console.log("\nAll ticket tests passed.");
