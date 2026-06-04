# Load test results

Per-run output of the k6 scripts under `tests/load/`. Newest results at
the top. The "before / after" framing for catalog edge caching
(specs/003-catalog-edge-caching) is what gives this file its narrative
shape — anything else just gets a `## Run YYYY-MM-DD` heading.

See `docs/load-test.md` for what each script measures.

---

## Before catalog edge caching

**Run date**: 2026-06-04 (pre-merge of `week-06-performance`).

**Target**: `https://joule-lilac.vercel.app` — current `main`, no edge cache headers, no image optimisation.

**Method**:

```powershell
k6 run -e BASE_URL=https://joule-lilac.vercel.app tests/load/sustained.js > before-sustained.txt 2>&1
k6 run -e BASE_URL=https://joule-lilac.vercel.app tests/load/journey.js > before-journey.txt 2>&1
```

Full raw outputs preserved under `docs/k6-runs/before-sustained.txt` and `docs/k6-runs/before-journey.txt`.

### Sustained — aggregate

| Metric                  |  Value |
| ----------------------- | -----: |
| `http_req_duration` p95 | 383 ms |
| `http_req_duration` p99 | 499 ms |
| `http_req_failed`       | 0.00 % |
| Total requests          |   1368 |
| Checks passed           |  100 % |

### Sustained — per route tag

| Tag                                |    p95 |
| ---------------------------------- | -----: |
| `http_req_duration{route:catalog}` | 327 ms |
| `http_req_duration{route:product}` | 453 ms |
| `http_req_duration{route:search}`  | 251 ms |
| `http_req_duration{route:compare}` | 272 ms |

### Journey — per flow

| Flow      | `journey_duration` p95 | Mostly think-time       |
| --------- | ---------------------: | :---------------------- |
| `browse`  |                 6.13 s | yes (3 pages × `sleep`) |
| `shop`    |                11.46 s | yes (4 pages × `sleep`) |
| `compare` |                15.28 s | yes (6 pages × `sleep`) |

Per-request `http_req_duration` p95 across the journey: 378 ms (matches sustained-run aggregate within noise).

### Surprise — baseline is already fast

The original spec assumed a `route:catalog` p95 of ~2 s with the catalog uncached. The actual measured number is **327 ms**, which is already 2.4× under the spec's "after-caching target" of 800 ms. See [specs/003-catalog-edge-caching/spec.md](../specs/003-catalog-edge-caching/spec.md) "Adjustment 3" for the SC reframing.

---

## After catalog edge caching (v1, TTL-only)

**Run date**: _to be captured after merging week-06-performance to main and the post-deploy smoke action has run at least once (so the cache is warm)._

**Target**: `https://joule-lilac.vercel.app`

**Method**: same as above.

### Sustained — aggregate

| Metric                  | Before | After |     Δ |
| ----------------------- | -----: | ----: | ----: |
| `http_req_duration` p95 | 383 ms | _tbd_ | _tbd_ |
| `http_req_duration` p99 | 499 ms | _tbd_ | _tbd_ |
| `http_req_failed`       | 0.00 % | _tbd_ | _tbd_ |

### Sustained — per route tag

| Tag                                | Before | After |     Δ | SC                               |
| ---------------------------------- | -----: | ----: | ----: | -------------------------------- |
| `http_req_duration{route:catalog}` | 327 ms | _tbd_ | _tbd_ | SC-001 (reframed; stay < 400 ms) |
| `http_req_duration{route:product}` | 453 ms | _tbd_ | _tbd_ | SC-002 (n/a v1 — not cached)     |
| `http_req_duration{route:search}`  | 251 ms | _tbd_ | _tbd_ | —                                |
| `http_req_duration{route:compare}` | 272 ms | _tbd_ | _tbd_ | —                                |

### Journey — per flow

| Flow      |  Before | After |     Δ | SC                              |
| --------- | ------: | ----: | ----: | ------------------------------- |
| `browse`  |  6.13 s | _tbd_ | _tbd_ | SC-006 (reframed; mostly sleep) |
| `shop`    | 11.46 s | _tbd_ | _tbd_ | —                               |
| `compare` | 15.28 s | _tbd_ | _tbd_ | —                               |

### Interpretation — when the after numbers land

The catalog cache's headline win was originally framed as "drop p95 by ≥ 50 %" but the before-baseline showed there's no 50 % to drop. **Expected after-pattern**:

- `route:catalog` p95 stays in the 200–400 ms range (already that fast — no big win available on the latency axis).
- The function-invocation count for cached routes drops by ≥ 90 % (Vercel dashboard `Function Invocations` metric for `/`, `/categories`, `/category/[slug]`, `/search`, `/compare`). This is the actual headline — same speed, ~10× less compute.
- `x-vercel-cache: HIT` on the second hit of any cached route, confirming the cache is doing its job.
- `route:product` p95 unchanged (product page is deliberately not cached in v1 — its load reads `locals.user`).
- The `spike.js` recovery threshold should pass more comfortably because cached responses don't multiply Supabase load during the burst — this is the operational win the cache delivers even when the latency win is small.

The honest framing for the portfolio: **"the feature ships not because the site was slow but because it shouldn't go slow when traffic spikes or Supabase blips, and to materially reduce function invocation cost as traffic grows."**

---

## Image Vitals — before and after image optimisation

Different question from the k6 numbers above. k6 only fetches HTML — it doesn't load CSS / JS / images, so it can't measure how heavy or how slow a page actually feels to a real visitor. This section captures the Web Vitals before and after specs/004-image-optimization shipped, using two complementary tools:

- **Chrome DevTools Network panel** for image-payload totals (synthetic, controlled connection throttling).
- **Vercel Speed Insights** for real-user CLS / LCP across the whole catalog (real, accumulates over a week).

### Method

**Synthetic** (run once before, once after):

```bash
# Open https://joule-lilac.vercel.app in an incognito window
# DevTools → Network → Throttling: Fast 4G → Disable cache
# Refresh, wait for load, filter type=img, copy totals into the table below
# Then: npx lighthouse https://joule-lilac.vercel.app --view
# Save the HTML output as docs/lighthouse-before.html / docs/lighthouse-after.html
```

**Real-user**: visit `https://vercel.com/<team>/joule/speed-insights` one week after merge; screenshot the CLS and LCP charts for `/`, `/category/<slug>`, `/product/<slug>`.

### Synthetic — Lighthouse on `/` (before run captured 2026-06-04)

Full report at `docs/lighthouse-before.html`.

| Metric                         |      Before | After |     Δ | SC                              |
| ------------------------------ | ----------: | ----: | ----: | ------------------------------- |
| Lighthouse Performance score   |      **99** | _tbd_ | _tbd_ | SC-004 (reframed; stay ≥ 99)    |
| Lighthouse LCP                 |       1.6 s | _tbd_ | _tbd_ | SC-003 (reframed; stay ≤ 2.0 s) |
| Lighthouse FCP                 |       1.6 s | _tbd_ | _tbd_ | —                               |
| Lighthouse **CLS**             | **0.00005** | _tbd_ | _tbd_ | SC-001 (reframed; stay < 0.01)  |
| Lighthouse Total Blocking Time |        0 ms | _tbd_ | _tbd_ | —                               |
| Lighthouse Speed Index         |       2.2 s | _tbd_ | _tbd_ | —                               |

### Real-user — Speed Insights, one week after deploy

To be captured one week after `week-06-performance` merges to main and accumulates real-user data.

| Route              | CLS before | CLS after | LCP before (ms) | LCP after (ms) | SC             |
| ------------------ | ---------: | --------: | --------------: | -------------: | -------------- |
| `/`                |      _tbd_ |     _tbd_ |           _tbd_ |          _tbd_ | SC-001, SC-003 |
| `/category/<slug>` |      _tbd_ |     _tbd_ |           _tbd_ |          _tbd_ | SC-001, SC-003 |
| `/product/<slug>`  |      _tbd_ |     _tbd_ |           _tbd_ |          _tbd_ | SC-001         |

### Interpretation — when the after numbers land

Same surprise as the cache feature, sharper. The site already scores **99/100 on Lighthouse Performance** before any image optimisation. CLS is **0.00005** — four orders of magnitude under the "Good" threshold of 0.1. LCP is 1.6 s with a score of 0.99.

**Expected after-pattern**:

- Performance score stays at 99–100; no headroom to improve. The SC-004 target (+15 points) was unreachable from the start.
- CLS stays at zero. The `<Image>` component's explicit `width`/`height` is now insurance — when the catalog grows or a product with an unexpected aspect ratio is added, the page can't reflow.
- LCP either stays the same (Vercel image-optimisation overhead cancels the AVIF-savings win on a small image) or improves marginally — neither hits the spec's −30 % target because the starting point is already so good.
- Image payload _should_ drop visibly in DevTools (AVIF is materially smaller than the JPG the Unsplash CDN returns by default) — that's the cleanest "this feature did something" signal to capture in the after run.

The honest framing: **"this feature ships not because the page was visually janky but because the `<Image>` component is the right primitive for any future image and prevents a class of bugs (layout shift, oversized payloads) that would otherwise surface as the catalog grows."**
