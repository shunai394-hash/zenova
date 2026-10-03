# ZENOVA Quality Loop

## Goal

ZENOVA aims for an award-level creative product experience, using Awwwards, Webby Awards, and FWA as **aspirational quality benchmarks**. This is a target for craft and user experience, not a claim of award eligibility or outcome.

## Non-negotiable review rule

A check is not a PASS merely because it was performed.

Every audit item must be one of:

- PASS — verified with evidence
- FAIL — reproduced or directly observed
- UNVERIFIED — not yet proven
- BLOCKED — cannot be tested because a prerequisite is missing

Never convert UNVERIFIED into PASS.

## Customer journey audit

Repeat this complete journey after every meaningful change:

1. First visit — understand value within seconds.
2. Choose a starting point — image or text.
3. Write an idea — presets help when the user is unsure.
4. Configure — model, duration, aspect ratio, sound.
5. Generate — clear progress, no ambiguous waiting.
6. Wait/reload — job survives navigation/reload.
7. Complete — actual video is playable and understandable.
8. Review — user can judge the result immediately.
9. Improve — the next prompt is easier to write.
10. Generate again — the loop gets faster and clearer.

## Quality dimensions

### 1. Product desirability
- Strong first impression
- Clear value proposition
- Premium visual hierarchy
- Real examples / useful presets
- No unexplained controls
- Clear reason to try now

### 2. Usability
- First-time user can complete a video without instructions
- Mobile and desktop usable
- Keyboard and screen-reader basics work
- Errors explain what to do next
- Busy states prevent accidental duplicate actions
- Reload/recovery is understandable

### 3. Creative quality
Inspect real output where possible:
- Motion quality
- Subject consistency
- Camera movement
- Lighting
- Composition
- Audio
- Aspect ratio
- Final frame
- Prompt-to-result fidelity

### 4. Reliability
Test:
- Timeout
- Temporary API failure
- Repeated polling
- Multiple tabs
- Repeated clicks
- Reload during generation
- Expired authentication
- Expired ticket
- Failed generation
- Completed generation with usage-recording failure

### 5. Data integrity and security
Verify:
- One request_id is counted at most once
- Concurrent requests cannot bypass quota
- Authenticated user cannot mutate another user's usage
- Completed videos are not lost when accounting fails
- Server-side secrets never reach the client
- Production RLS/RPC permissions are least-privilege

### 6. Performance
Measure:
- Initial page load
- Interaction latency
- Upload behavior
- Polling frequency
- Error recovery
- Large image handling
- Mobile viewport behavior

## AI quality cycle

For each audit cycle:

**Observe → Diagnose → Fix → Verify → Re-audit → Repeat**

The cycle stops only when all applicable critical checks are PASS and there are no known customer-blocking FAILs. Anything not actually tested remains UNVERIFIED.

## Evidence report

Every cycle reports:

- What was checked
- Customer-visible finding
- Root cause
- Change made
- Tests run
- Evidence
- PASS / FAIL / UNVERIFIED / BLOCKED
- Remaining risk
- Next cycle

## Production gate

Do not call the product production-ready from local/mock tests alone.

Required evidence includes:
- production deployment identity
- real customer-flow verification
- real API or an explicitly marked unavailable dependency
- database migration status
- security checks
- regression results
- mobile/desktop review

Main must remain untouched until the evidence supports promotion.
