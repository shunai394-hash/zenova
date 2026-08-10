/**
 * 利用管理（plans / usage / limit / consume）確認
 * Usage: npx tsx scripts/probe-usage-management.ts
 *
 * freeプラン仕様:
 *   動画1本/月
 *
 * 事前に migration を適用:
 *   supabase/migrations/20260711010000_usage_management.sql
 */

import { readFile } from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";

async function loadEnv() {
  const env = await readFile(path.join(process.cwd(), ".env.local"), "utf8");

  for (const line of env.split(/\r?\n/)) {
    const m = line.match(/^([^#=]+)=(.*)$/);
    if (m) {
      process.env[m[1].trim()] = m[2].trim();
    }
  }
}

async function main() {
  await loadEnv();

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim();

  console.log(
    "[probe] SUPABASE_URL=",
    url ? `set(len=${url.length})` : "MISSING"
  );

  console.log(
    "[probe] SUPABASE_KEY=",
    key ? `set(len=${key.length})` : "MISSING"
  );

  if (!url || !key) {
    throw new Error("Supabase env missing");
  }

  const {
    probeUsageTables,
    listPlans,
    getUsageSummary,
    checkVideoLimit,
    consumeVideoUsage,
    ensureActiveSubscription,
    insertVideoCredit,
    DEFAULT_USAGE_USER_ID,
  } = await import("../src/lib/usage");

  const status = await probeUsageTables();

  console.log(
    "[probe] connection=",
    JSON.stringify(status, null, 2)
  );

  if (!status.ok) {
    throw new Error("usage tables missing");
  }

  const plans = await listPlans();

  console.log(
    "[probe] plans=",
    plans
      .map((p) => `${p.id}:${p.price}/${p.video_limit}`)
      .join(", ")
  );

  const required = [
    "free",
    "starter",
    "creator",
    "pro",
    "business",
  ];

  for (const id of required) {
    if (!plans.some((p) => p.id === id)) {
      throw new Error(`plan missing: ${id}`);
    }
  }

  const userId = randomUUID();

  console.log("[probe] test_user_id=", userId);
  console.log(
    "[probe] default_user_id=",
    DEFAULT_USAGE_USER_ID
  );

  // free = 1本/月
  await ensureActiveSubscription(userId, "free");

  const usageFree = await getUsageSummary(userId);

  console.log(
    "[probe] usage(free)=",
    usageFree
  );

  if (usageFree.plan !== "free") {
    throw new Error(
      `expected free plan, got ${usageFree.plan}`
    );
  }

  if (usageFree.video_limit !== 1) {
    throw new Error(
      `expected free video_limit=1, got ${usageFree.video_limit}`
    );
  }

  const freeLimit = await checkVideoLimit(userId);

  console.log(
    "[probe] limit(free)=",
    freeLimit
  );

  if (!freeLimit.allowed) {
    throw new Error(
      "free should allow 1 video"
    );
  }

  const consumeFree =
    await consumeVideoUsage(userId, {
      probe: true,
      plan: "free",
    });

  console.log(
    "[probe] consume(free)=",
    consumeFree
  );

  if (
    !consumeFree.ok ||
    !consumeFree.summary
  ) {
    throw new Error(
      "free consume failed"
    );
  }

  const afterFree =
    await checkVideoLimit(userId);

  console.log(
    "[probe] limit(after free consume)=",
    afterFree
  );

  if (afterFree.allowed) {
    throw new Error(
      "free should deny after 1 video"
    );
  }


  // credit確認
  await insertVideoCredit({
    user_id: userId,
    credits: 2,
    source: "probe",
  });

  const creditLimit =
    await checkVideoLimit(userId);

  console.log(
    "[probe] limit(with credit)=",
    creditLimit
  );

  if (!creditLimit.allowed) {
    throw new Error(
      "credit should allow video"
    );
  }


  // starter確認
  const starterUser = randomUUID();

  await ensureActiveSubscription(
    starterUser,
    "starter"
  );

  const starterUsage =
    await getUsageSummary(starterUser);

  console.log(
    "[probe] usage(starter)=",
    starterUsage
  );

  if (starterUsage.video_limit !== 5) {
    throw new Error(
      `expected starter video_limit=5, got ${starterUsage.video_limit}`
    );
  }


  const starterConsume =
    await consumeVideoUsage(
      starterUser,
      {
        probe: true,
        plan: "starter",
      }
    );

  console.log(
    "[probe] consume(starter)=",
    starterConsume
  );

  if (
    !starterConsume.ok ||
    starterConsume.summary?.used !== 1
  ) {
    throw new Error(
      "starter consume failed"
    );
  }


  console.log("[probe] OK");
}

main().catch((err) => {
  console.error(
    "[probe-usage-management] FAILED",
    err
  );

  process.exit(1);
});