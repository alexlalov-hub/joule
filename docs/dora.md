# DORA report — Joule

Generated 2026-09-06T10:15:25.596Z · window: last 28 days · 0 merged PRs in window

## Headline

| Metric                         |                    Value | Method                                                                                                                              |
| ------------------------------ | -----------------------: | ----------------------------------------------------------------------------------------------------------------------------------- |
| Deployment frequency           |             0.0 per week | Each PR merged to main is one Vercel auto-deploy.                                                                                   |
| Lead time for changes (median) |                    0 min | PR opened → PR merged.                                                                                                              |
| Change failure rate            |              0% (0 of 0) | PRs whose title matches `^(revert\|hotfix\|fix(\(.+\))?:\|chore.*revert)` or carrying a `bug`/`regression`/`hotfix`/`revert` label. |
| Mean time to recovery (median) | n/a — no paired failures | For each fix PR, time back to the previous non-fix merge within 7 days.                                                             |

## Deploys per week

_No merges in the window._

## Failure pairs

_No fix-pair detected in the window. Either nothing broke, or the heuristic missed it._

## Caveats

- Deploys are inferred from PR merges to `main`, not from Vercel deploy events. A failed Vercel build that never reached production still counts as a deploy here. Tightening this would mean pulling the Vercel API and matching against deployment status.
- "Failure" is a heuristic on PR titles and labels (`^(revert|hotfix|fix(\(.+\))?:|chore.*revert)` or `bug|regression|hotfix|revert`). False positives happen when a PR titled `fix: typo in docs` flips a stable green into a counted failure.
- MTTR pairs each fix to the _previous non-fix merge within 7 days_. That's the simplest defensible choice but it can mis-pair when several merges land back-to-back.
- Sample sizes will be small for a few weeks. Treat the headline as a directional read, not an SLO.
