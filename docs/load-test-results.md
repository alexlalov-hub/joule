# Load test results

Per-run output of the k6 scripts under `tests/load/`. Newest results at
the top. The "before / after" framing for catalog edge caching
(specs/003-catalog-edge-caching) is what gives this file its narrative
shape — anything else just gets a `## Run YYYY-MM-DD` heading.

See `docs/load-test.md` for what each script measures.

---

## Before catalog edge caching

**Run date**: _to be captured before specs/003-catalog-edge-caching ships to production._

**Target**: `https://joule-lilac.vercel.app`

**Method**:

```bash
k6 run -e BASE_URL=https://joule-lilac.vercel.app tests/load/sustained.js > before-sustained.txt
k6 run -e BASE_URL=https://joule-lilac.vercel.app tests/load/journey.js > before-journey.txt
```

### Sustained — aggregate

| Metric                  | Value |
| ----------------------- | ----- |
| `http_req_duration` p95 | _tbd_ |
| `http_req_duration` p99 | _tbd_ |
| `http_req_failed`       | _tbd_ |

### Sustained — per route tag

| Tag                                | p95   |
| ---------------------------------- | ----- |
| `http_req_duration{route:catalog}` | _tbd_ |
| `http_req_duration{route:product}` | _tbd_ |
| `http_req_duration{route:search}`  | _tbd_ |
| `http_req_duration{route:compare}` | _tbd_ |

### Journey — per flow

| Flow      | `journey_duration` p95 |
| --------- | ---------------------- |
| `browse`  | _tbd_                  |
| `shop`    | _tbd_                  |
| `compare` | _tbd_                  |

Paste the full k6 summary blocks below this table when the run is captured.

---

## After catalog edge caching (v1, TTL-only)

**Run date**: _to be captured after merging week-06-performance to main and the post-deploy smoke action has run at least once (so the cache is warm)._

**Target**: `https://joule-lilac.vercel.app`

**Method**: same as above.

### Sustained — aggregate

| Metric                  | Before | After |     Δ |
| ----------------------- | -----: | ----: | ----: |
| `http_req_duration` p95 |  _tbd_ | _tbd_ | _tbd_ |
| `http_req_duration` p99 |  _tbd_ | _tbd_ | _tbd_ |
| `http_req_failed`       |  _tbd_ | _tbd_ | _tbd_ |

### Sustained — per route tag

| Tag                                | Before | After |     Δ | SC                |
| ---------------------------------- | -----: | ----: | ----: | ----------------- |
| `http_req_duration{route:catalog}` |  _tbd_ | _tbd_ | _tbd_ | SC-001 (< 800 ms) |
| `http_req_duration{route:product}` |  _tbd_ | _tbd_ | _tbd_ | SC-002 (n/a v1)   |
| `http_req_duration{route:search}`  |  _tbd_ | _tbd_ | _tbd_ | —                 |
| `http_req_duration{route:compare}` |  _tbd_ | _tbd_ | _tbd_ | —                 |

### Journey — per flow

| Flow      | Before | After |     Δ | SC               |
| --------- | -----: | ----: | ----: | ---------------- |
| `browse`  |  _tbd_ | _tbd_ | _tbd_ | SC-006 (-30 % +) |
| `shop`    |  _tbd_ | _tbd_ | _tbd_ | —                |
| `compare` |  _tbd_ | _tbd_ | _tbd_ | —                |

### Interpretation

_To be filled in once the after numbers are captured._

Expected based on the spec:

- `route:catalog` p95 should drop by > 50 % (now mostly served from edge cache without function startup).
- `route:product` p95 should be roughly unchanged — `/product/<slug>` was deferred from caching in v1 (see specs/003-catalog-edge-caching spec "Adjustment 2").
- `route:search` and `route:compare` get a 60 s cache so should see a modest improvement on hot queries; p95 is dominated by queries on a cold cache key.
- `journey:browse` should benefit cumulatively because every page in the flow is now cached.
- `route:product` _not_ improving is the diagnostic that says the rest of the wins were genuine and not just timing noise.

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

### Synthetic — home page on Fast 4G

| Metric                       | Before | After |     Δ | SC               |
| ---------------------------- | -----: | ----: | ----: | ---------------- |
| Total image payload (KB)     |  _tbd_ | _tbd_ | _tbd_ | SC-002 (≥ -60 %) |
| Number of image requests     |  _tbd_ | _tbd_ | _tbd_ | —                |
| Largest single image (KB)    |  _tbd_ | _tbd_ | _tbd_ | (hero asset)     |
| Lighthouse Performance score |  _tbd_ | _tbd_ | _tbd_ | SC-004 (+15 pts) |
| Lighthouse CLS contribution  |  _tbd_ | _tbd_ | _tbd_ | SC-001 (< 0.1)   |
| Lighthouse LCP (ms)          |  _tbd_ | _tbd_ | _tbd_ | SC-003 (≥ -30 %) |

### Real-user — Speed Insights, one week after deploy

| Route              | CLS before | CLS after | LCP before (ms) | LCP after (ms) | SC             |
| ------------------ | ---------: | --------: | --------------: | -------------: | -------------- |
| `/`                |      _tbd_ |     _tbd_ |           _tbd_ |          _tbd_ | SC-001, SC-003 |
| `/category/<slug>` |      _tbd_ |     _tbd_ |           _tbd_ |          _tbd_ | SC-001, SC-003 |
| `/product/<slug>`  |      _tbd_ |     _tbd_ |           _tbd_ |          _tbd_ | SC-001         |

### Interpretation

_To be filled in once both runs land._

Expected based on the spec:

- Image payload drops dramatically — AVIF / WebP at the right resolution is typically 60-80 % smaller than the original JPGs.
- CLS drops to near-zero because every image now has `width` and `height` attributes and the browser reserves space before the bytes arrive.
- LCP improves proportional to the hero image's payload reduction, since the hero is usually the LCP element on `/` and `/product/<slug>`.
- Lighthouse Performance score gain comes from the combined CLS / LCP / Total Blocking Time wins.
