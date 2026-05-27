# Load testing

Five [k6](https://k6.io) scripts under `tests/load/`, each pointed at a
different question. All of them target the public, cacheable catalog
routes — AI endpoints stay out of scope because they're rate-limited at
20 req / 5 min per IP, which would bounce any load test off `429` before
it produced useful data.

## Scripts

| File           | VUs                         | Duration   | What it answers                                                                                      |
| -------------- | --------------------------- | ---------- | ---------------------------------------------------------------------------------------------------- |
| `smoke.js`     | 1                           | 30 s       | "Is the deploy alive? Do the hot routes return real HTML, not Vercel's error page?" Used by CI.      |
| `sustained.js` | 0 → 20 → 0                  | 3 min      | "At ~20 concurrent shoppers, what's p95/p99? Does latency stay flat or climb (connection leak)?"     |
| `journey.js`   | 0 → 15 → 0                  | 3 min      | "When VUs walk a realistic flow (home → category → product → compare), do journeys feel responsive?" |
| `spike.js`     | 2 → 50 → 2                  | 1 min 25 s | "What happens during a 25× traffic burst? Does the system recover after the spike drops?"            |
| `stress.js`    | 10 → 30 → 50 → 80 → 120 → 0 | 4 min 30 s | "Where is the ceiling? At which VU count do thresholds start to break?" Not run in CI.               |

### What each one actually does

**`smoke.js`** — A single VU walks seven hardcoded routes in order. For each route it asserts the response is `200` AND that the body contains a known marker string (e.g. the home page must contain `"Joule"`). The marker check is the load-bearing one — a page that 5xxs but returns Vercel's HTML error placeholder used to pass the old body-length-only check. Groups split the output by route so the summary tells you which page broke.

**`sustained.js`** — Ramps VUs `0 → 5 → 20 → 20 → 0` over 3 minutes. Each VU picks a route from a **weighted** list (popular routes hit more often — `/` is 8× more likely than `/compare`), GETs it, sleeps a randomised think-time, repeats. Per-route latency thresholds are applied via k6 tags so a slow `/compare` doesn't hide behind a fast `/`. The 30-second warm-up phase fills the `src/lib/cache.ts` in-memory caches; if you see latency climbing during the 60-second hold phase, that's a leak.

**`journey.js`** — Each VU walks one of three realistic flows, picked at random with traffic-matching weights:

- **Browse-and-bounce** (60%): home → categories → category → leave. Three pages, lots of think-time.
- **Window-shopping** (30%): home → category → product → product → leave. Four pages.
- **Comparison-shopping** (10%): home → category → product → search → compare → product → leave. Six pages, hits the heaviest queries.

A custom `journey_duration` metric tracks wall-clock time per journey. The thresholds say each journey-type must complete in a reasonable end-to-end window — catches the case where individual requests are fast but the journey feels slow.

**`spike.js`** — Goes `2 → 50` VUs over 10 seconds, holds 50 for 30s, then drops back to `2`. This is the "product went viral" scenario. The script tags the last 20 seconds as the `recovery` phase and asserts that p95 in recovery is back under 3s — proving the system not only survived the spike but settled afterwards. Exposes serverless cold-start cascades, connection-pool saturation, and cache stampede behaviour.

**`stress.js`** — Steps VUs up in five stages: `10 → 30 → 50 → 80 → 120`. Each stage has its own p95 threshold that gets progressively looser. When a stage breaks its threshold, that's where the current Vercel + Supabase setup hits the ceiling. **Not for CI** — it's intentionally expensive (~50k requests in a full run) and will trip Supabase's free-tier 60-connection limit on purpose. Run ad-hoc on a quiet day.

## Running

```bash
# Install k6 once (https://k6.io/docs/get-started/installation/)
# macOS:    brew install k6
# Windows:  winget install k6.k6

# Local dev (run `npm run dev` first in a separate terminal):
k6 run tests/load/smoke.js

# Against the deployed Vercel build:
k6 run -e BASE_URL=https://joule-lilac.vercel.app tests/load/smoke.js
k6 run -e BASE_URL=https://joule-lilac.vercel.app tests/load/sustained.js
k6 run -e BASE_URL=https://joule-lilac.vercel.app tests/load/journey.js
k6 run -e BASE_URL=https://joule-lilac.vercel.app tests/load/spike.js

# Stress — ad-hoc only, NOT in CI:
k6 run -e BASE_URL=https://joule-lilac.vercel.app tests/load/stress.js
```

## Thresholds

The scripts assert these in the run itself, so a regressed deploy fails
the script rather than needing a separate eyeball. All thresholds are
intentionally loose enough that a single Vercel cold start doesn't fail
the run on the first request.

| Script    | Aggregate                                           | Per-tag                                      |
| --------- | --------------------------------------------------- | -------------------------------------------- |
| smoke     | `http_req_failed<0.01`, `med<2000`, `checks==1.0`   | —                                            |
| sustained | `http_req_failed<0.02`, `p(95)<3000`, `p(99)<6000`  | `p(95)<2500–4000` per route group            |
| journey   | `http_req_failed<0.02`, `p(95)<3000`                | `journey_duration p(95)<10–25s` per flow     |
| spike     | `http_req_failed<0.05`, `p(95)<8000`, `p(99)<15000` | `p(95)<3000` in the recovery phase           |
| stress    | `http_req_failed<0.05`, `p(95)<5000`                | per-stage `p(95)<1500–8000` (climbing scale) |

Tighten once a baseline is established. Per-run results should be
captured in `docs/load-test-results.md` so trends are visible.

## CI integration

Only `smoke.js` runs in CI today, via `.github/workflows/smoke.yml`
after every push to `main`. It waits 90 seconds for Vercel to settle
its deploy, then runs against `vars.PROD_URL` (default
`https://joule-lilac.vercel.app`). The other four are manual — invoke
them locally when you want the answers they're built for.

A potential follow-up: a nightly GitHub Action that runs `sustained.js`
and `journey.js` against prod and appends a row to
`docs/load-test-results.md`. Not wired up yet because the project's
baseline is still moving week-over-week; pinning a trendline before that
settles would just track development velocity, not regressions.

## Why no AI endpoints?

The rate limiter in `src/lib/server/rate-limit.ts` caps every IP at
20 requests per 5 minutes. A load test with 20 VUs would burn through
the budget in under a minute and then collect `429`s. The right way to
load-test those endpoints is in a separate suite with the rate limit
disabled via a test-only env var; not worth wiring up at this stage.

## What these tests don't cover

- **Write paths** (cart add, wishlist toggle, post review, checkout
  session). These have very different perf characteristics — they
  involve auth-cookie state, multiple DB round-trips, sometimes Stripe
  API calls. Worth a separate `writes.js` once we have authenticated VU
  fixtures.
- **Real geographic latency.** k6 runs from one location (your machine
  or the CI runner); a real user in Auckland sees a different number
  than the test reports. The script measures Vercel edge performance,
  not last-mile latency.
- **Asset loading.** k6 only fetches the HTML response; it doesn't load
  CSS/JS/images. Real page-load time is higher.
- **Authenticated sessions.** All current scripts hit anonymous endpoints.
  Add a login step and per-VU cookie jar when adding write-path tests.
