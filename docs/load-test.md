# Load testing

Two [k6](https://k6.io) scripts under `tests/load/`. Both target the
public, cacheable catalog routes — AI endpoints stay out of scope because
they're rate-limited at 20 req / 5 min per IP, which would bounce any load
test off `429` before it produced useful data.

## Scripts

| File                      | VUs        | Duration    | What it's for                                                                            |
| ------------------------- | ---------- | ----------- | ---------------------------------------------------------------------------------------- |
| `tests/load/smoke.js`     | 1          | 30 s        | "The deploy is up and the hot routes respond." Used by the post-deploy smoke step in CI. |
| `tests/load/sustained.js` | 0 → 20 → 0 | 3 min total | Sustained read-only load to measure p95/p99 under realistic VU count.                    |

## Running

```bash
# Install k6 once (https://k6.io/docs/get-started/installation/)
# macOS:   brew install k6
# Windows: winget install k6.k6

# Local dev (start with npm run dev first, separate terminal):
k6 run tests/load/smoke.js

# Against a Vercel preview or prod:
k6 run -e BASE_URL=https://joule.vercel.app tests/load/sustained.js
```

## Thresholds

The scripts assert these in the k6 run itself, so a regressed deploy
fails the script rather than needing a separate eyeball:

| Script    | Threshold                                                |
| --------- | -------------------------------------------------------- |
| smoke     | `http_req_failed < 1%`, median latency `< 2000 ms`       |
| sustained | `http_req_failed < 2%`, p95 `< 3000 ms`, p99 `< 6000 ms` |

These are deliberately loose so a cold Vercel function start doesn't fail
the run on the first request. Tighten once the project has a baseline
established in `docs/load-test-results.md` (added on each run).

## Why no AI endpoints?

The rate limiter in `src/lib/server/rate-limit.ts` caps every IP at 20
requests per 5 minutes. A load test with 20 VUs would burn through the
budget in under a minute and then collect `429`s. The right way to load
test those endpoints is in a separate suite with the rate limit disabled
via a test-only env, which isn't worth wiring up at this stage.
