# DORA report — Joule

Generated 2026-06-21T09:46:49.172Z · window: last 28 days · 3 merged PRs in window

## Headline

| Metric                         |        Value | Method                                                                                                                              |
| ------------------------------ | -----------: | ----------------------------------------------------------------------------------------------------------------------------------- |
| Deployment frequency           | 0.8 per week | Each PR merged to main is one Vercel auto-deploy.                                                                                   |
| Lead time for changes (median) |        3 min | PR opened → PR merged.                                                                                                              |
| Change failure rate            | 33% (1 of 3) | PRs whose title matches `^(revert\|hotfix\|fix(\(.+\))?:\|chore.*revert)` or carrying a `bug`/`regression`/`hotfix`/`revert` label. |
| Mean time to recovery (median) |       17 min | For each fix PR, time back to the previous non-fix merge within 7 days.                                                             |

## Deploys per week

| Week (Mon)         | Deploys |
| ------------------ | ------: |
| week of 2026-05-25 |       2 |
| week of 2026-06-01 |       1 |

## Failure pairs

| Intro PR                                                 | Failure PR                                                           | Recovery |
| -------------------------------------------------------- | -------------------------------------------------------------------- | -------: |
| #9 Week 05 — admin platform + Spec-Kit + local SonarQube | #10 fix(ci): unblock the SonarQube workflow + clean prettier on DORA |   17 min |

## Caveats

- Deploys are inferred from PR merges to `main`, not from Vercel deploy events. A failed Vercel build that never reached production still counts as a deploy here. Tightening this would mean pulling the Vercel API and matching against deployment status.
- "Failure" is a heuristic on PR titles and labels (`^(revert|hotfix|fix(\(.+\))?:|chore.*revert)` or `bug|regression|hotfix|revert`). False positives happen when a PR titled `fix: typo in docs` flips a stable green into a counted failure.
- MTTR pairs each fix to the _previous non-fix merge within 7 days_. That's the simplest defensible choice but it can mis-pair when several merges land back-to-back.
- Sample sizes will be small for a few weeks. Treat the headline as a directional read, not an SLO.
