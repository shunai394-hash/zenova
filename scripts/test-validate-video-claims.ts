/**
 * Tests A–E for video claim gating (confirmed as single source of truth).
 * Run: npx --yes tsx scripts/test-validate-video-claims.ts
 */

import {
  buildFallbackScenarioFromConfirmed,
  validateKlingPromptClaims,
  validateNarrationScript,
  validateOptimizeClaims,
  validateSalesScenarioClaims,
  validateVideoClaimText,
  validateVideoPlanClaims,
} from "../src/lib/product-analysis/validate-video-claims";
import { buildStyleAwareKlingPrompt } from "../src/lib/analyze/style-templates";

type Case = { label: string; text: string; expectOk: boolean };

function assert(cond: boolean, msg: string) {
  if (!cond) throw new Error(msg);
}

function checkCases(
  name: string,
  ctx: Parameters<typeof validateVideoClaimText>[1],
  cases: Case[]
) {
  console.log(`\n=== ${name} ===`);
  for (const c of cases) {
    const out = validateVideoClaimText(c.text, ctx);
    const ok = Boolean(out);
    const pass = ok === c.expectOk;
    console.log(
      `${pass ? "PASS" : "FAIL"} | ${c.label} | in="${c.text}" | out="${out}" | expectOk=${c.expectOk}`
    );
    assert(pass, `${name}: ${c.label}`);
  }
}

function main() {
  // Test A
  const ctxA = {
    productName: "アームカバー",
    target: "外出が多い人",
    buckets: {
      confirmed: ["UVカット", "薄手", "指穴付き"],
      inferred: [],
      unknown: ["UPF値"],
      excluded: [],
      notSupported: [],
    },
  };
  checkCases("Test A", ctxA, [
    { label: "UVカット", text: "UVカット", expectOk: true },
    { label: "薄手", text: "薄手", expectOk: true },
    { label: "指穴", text: "指穴付き", expectOk: true },
    { label: "複合OK", text: "UVカット機能のある薄手アームカバー", expectOk: true },
    { label: "UPF50+", text: "UPF50+", expectOk: false },
    { label: "UV99%", text: "紫外線を99%カット", expectOk: false },
    { label: "通気性", text: "通気性が高い", expectOk: false },
  ]);

  // Test B
  const ctxB = {
    productName: "化粧水",
    target: "乾燥が気になる人",
    buckets: {
      confirmed: ["保湿"],
      inferred: [],
      unknown: [],
      excluded: [],
      notSupported: [],
    },
  };
  checkCases("Test B", ctxB, [
    { label: "保湿", text: "保湿", expectOk: true },
    { label: "乾燥肌改善", text: "乾燥肌改善", expectOk: false },
    { label: "肌質改善", text: "肌質が変わる", expectOk: false },
    { label: "治療", text: "肌を治療する", expectOk: false },
  ]);

  // Test C
  const ctxC = {
    productName: "スマホホルダー",
    target: "車ユーザー",
    buckets: {
      confirmed: ["角度調整可能"],
      inferred: [],
      unknown: [],
      excluded: ["ワイヤレス充電"],
      notSupported: ["ワイヤレス充電"],
    },
  };
  checkCases("Test C", ctxC, [
    { label: "ワイヤレス充電", text: "ワイヤレス充電", expectOk: false },
    { label: "ワイヤレス対応", text: "ワイヤレス対応", expectOk: false },
    { label: "充電対応", text: "充電対応", expectOk: false },
    { label: "角度調整", text: "角度調整可能", expectOk: true },
  ]);

  // Test D
  const ctxD = {
    productName: "便利グッズ",
    target: "購入検討者",
    buckets: {
      confirmed: [],
      inferred: [],
      unknown: ["素材の詳細", "重量"],
      excluded: [],
      notSupported: [],
    },
  };
  checkCases("Test D", ctxD, [
    { label: "素材捏造", text: "高品質なアルミニウム素材", expectOk: false },
    { label: "重量捏造", text: "わずか50gの軽量設計", expectOk: false },
    { label: "レビュー捏造", text: "口コミで人気の神アイテム", expectOk: false },
    { label: "体験捏造", text: "使ってみたら本当に良かった", expectOk: false },
  ]);

  // Test E
  const ctxE = ctxA;
  checkCases("Test E", ctxE, [
    { label: "使ってみた", text: "実際に使ってみた感想です", expectOk: false },
    { label: "してみた", text: "つけてみた結果涼しかった", expectOk: false },
  ]);

  // Optimize escalation
  console.log("\n=== Optimize escalation ===");
  const opt = validateOptimizeClaims(
    {
      score: 90,
      improvements: ["UVを強める"],
      optimized_hook: "紫外線を99%カットします",
      optimized_scene_1: "UVカット機能があります",
      optimized_scene_2: "薄手で快適",
      optimized_scene_3: "指穴付き",
      optimized_cta: "プロフィールのリンクから詳細をチェック",
      optimized_kling_prompt: "Create video with UPF50+",
    },
    ctxA,
    {
      hook: "UVカット機能があります",
      scene_1: "UVカット機能があります",
      scene_2: "薄手",
      scene_3: "指穴付き",
      cta: "プロフィールのリンクから詳細をチェック",
    }
  );
  assert(
    !opt.optimized_hook.includes("99%") && !/UPF/i.test(opt.optimized_kling_prompt),
    "optimize must not escalate UV→99%/UPF"
  );
  console.log("PASS | optimize no metric escalation");

  // Fallback also gated
  console.log("\n=== Fallback gate ===");
  const fb = buildFallbackScenarioFromConfirmed({
    productName: "アームカバー",
    target: "外出が多い人",
    confirmed: ["UVカット", "薄手", "指穴付き"],
  });
  const fbGated = validateSalesScenarioClaims(fb, ctxA);
  assert(
    !/99%|UPF|通気|使ってみた/.test(JSON.stringify(fbGated)),
    "fallback scenario must stay confirmed-only"
  );
  console.log("PASS | fallback scenario gated");

  // Narration
  console.log("\n=== Narration ===");
  const narr = validateNarrationScript(
    "使ってみた。UVカットで紫外線を99%カット。通気性も高い。",
    ctxA
  );
  assert(!/使ってみた|99%|通気/.test(narr), `narration unsafe: ${narr}`);
  assert(/UVカット/.test(narr) || /アームカバー/.test(narr), `narration too empty: ${narr}`);
  console.log(`PASS | narration gated → "${narr}"`);

  // Final VideoPlan
  console.log("\n=== Final VideoPlan ===");
  const plan = validateVideoPlanClaims(
    {
      title: "UV99%アームカバー",
      style: "ugc",
      duration: 15,
      cta: "プロフィールのリンクから詳細をチェック",
      timeline: [
        { scene: "Hook", second: "0-2", text: "使ってみた結果" },
        { scene: "Scene1", second: "2-6", text: "UVカット" },
        { scene: "Scene2", second: "6-10", text: "通気性が高い" },
        { scene: "Scene3", second: "10-13", text: "薄手" },
        { scene: "CTA", second: "13-15", text: "プロフィールのリンクから詳細をチェック" },
      ],
    },
    ctxA
  );
  assert(!/99%|使ってみた|通気/.test(JSON.stringify(plan)), "final plan leaked bad claims");
  assert(
    plan.timeline.some((t) => t.text.includes("UVカット")),
    "final plan should keep confirmed UVカット"
  );
  console.log("PASS | final VideoPlan gated");

  // Metric escalation: 軽量 → 50g
  console.log("\n=== Grounding (軽量 vs 50g) ===");
  const ctxLight = {
    productName: "ポーチ",
    buckets: {
      confirmed: ["軽量"],
      inferred: [],
      unknown: [],
      excluded: [],
      notSupported: [],
    },
  };
  assert(Boolean(validateVideoClaimText("軽量", ctxLight)), "軽量 OK");
  assert(!validateVideoClaimText("わずか50g", ctxLight), "50g NG");
  console.log("PASS | 軽量 OK / 50g NG");

  // Case E — Kling prompt (ugc / product_review) after style + claim gate
  console.log("\n=== Kling prompt (Case E) ===");
  const klingForbidden = [
    "使ってみた",
    "使った結果",
    "本音レビュー",
    "使用感",
    "愛用",
    "効果を実感",
    "UPF50",
    "UV99",
    "通気性",
    "冷感",
  ];
  for (const style of ["ugc", "product_review"] as const) {
    const styled = buildStyleAwareKlingPrompt({
      videoStyle: style,
      basePrompt:
        "Create a vertical TikTok commercial video showing アームカバー with confirmed features only: UVカット, 薄手, 指穴付き. 9:16.",
      productName: "アームカバー",
      durationSec: 15,
      confirmed: ["UVカット", "薄手", "指穴付き"],
      excluded: [],
    });
    const gated = validateKlingPromptClaims(styled, ctxA);
    const hits = klingForbidden.filter((w) => gated.includes(w));
    assert(hits.length === 0, `kling ${style} leaked: ${hits.join(", ")} | ${gated}`);
    assert(
      /UVカット|confirmed/i.test(gated),
      `kling ${style} should keep confirmed features: ${gated}`
    );
    console.log(`PASS | kling ${style} gated`);
  }

  // Injected experience must be stripped even if style/base sneaks it in
  const sneaky = validateKlingPromptClaims(
    "honest review, 使ってみた結果, UPF50+, 通気性が高い, UVカット",
    ctxA
  );
  assert(
    !/使ってみた|honest review|UPF50|通気/i.test(sneaky),
    `kling sneaky unsafe: ${sneaky}`
  );
  console.log("PASS | kling sneaky experience/specs replaced");

  console.log("\nAll tests PASSED");
}

main();
