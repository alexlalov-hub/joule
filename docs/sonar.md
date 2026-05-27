# SonarQube — local + CI

Joule runs SonarQube Community Edition (self-hosted) rather than SonarCloud. The cloud free tier didn't allow customising the quality gate or scanning non-main branches without paying; a self-hosted instance has none of those limits and the same scanner CLI talks to both.

## Local development

A docker-compose file at the repo root brings up SonarQube + its Postgres backend. Three npm scripts wrap the lifecycle so you don't have to memorise docker commands.

### One-time setup

```bash
# Start the SonarQube server (takes ~60s on first boot)
npm run sonar:up

# Tail the logs until you see "SonarQube is operational"
npm run sonar:logs
```

Then in a browser:

1. Open <http://localhost:9000>
2. Sign in with `admin` / `admin`, change the password when prompted
3. Create a project manually — **project key must be `joule`** (matches `sonar-project.properties`)
4. Pick **"Locally"** for the analysis method (you don't need an org)
5. Go to **My Account → Security → Generate a token**, save it
6. Export the token in your shell:

   ```bash
   # PowerShell
   $env:SONAR_TOKEN = "<token>"

   # cmd
   set SONAR_TOKEN=<token>

   # bash / zsh
   export SONAR_TOKEN=<token>
   ```

Project data and tokens persist in named docker volumes (`sonar_data`, `sonar_db_data`), so `sonar:down` / `sonar:up` cycles don't lose anything.

### Running a scan

```bash
npm run sonar:scan
```

That command:

1. Runs `vitest --coverage` so `coverage/lcov.info` is fresh.
2. Invokes `sonar-scanner` (the binary from the `sonarqube-scanner` npm dev-dep, on PATH via `node_modules/.bin/`). It reads `sonar-project.properties` and uses `SONAR_TOKEN` from the environment.
3. Pushes the results to whatever URL is in `sonar.host.url` (default `http://localhost:9000`).

This is the same shape as `./gradlew sonar` in a Gradle project — the scanner is a project-local dev tool, not a Docker container. No platform-specific path mounting or network mode to worry about.

When the scan finishes, open <http://localhost:9000/dashboard?id=joule> to see the report.

### The quality gate (gate-as-code)

The gate definition lives in `scripts/sonar-setup.js`, not in the SonarQube admin UI. Running `npm run sonar:setup` provisions the gate via SonarQube's REST API, applies it to the `joule` project, and is idempotent — re-running converges to the spec in the script.

Current gate:

| Condition                          | Threshold | Why                                         |
| ---------------------------------- | --------- | ------------------------------------------- |
| New code line coverage             | ≥ 85%     | Matches the vitest gate in `vite.config.ts` |
| New code branch coverage           | ≥ 75%     | Same                                        |
| New code duplications              | < 3%      | Standard Sonar default                      |
| Maintainability rating on new code | ≤ A       | No new code smells past A grade             |
| Reliability rating on new code     | ≤ A       | No new bugs                                 |
| Security rating on new code        | ≤ A       | No new vulnerabilities                      |
| Security hotspots reviewed         | 100%      | Every hotspot triaged                       |

To change the gate, edit `scripts/sonar-setup.js` (the `QUALITY_GATE` array), commit the change, and re-run:

```bash
npm run sonar:setup
```

#### First-run order

1. `npm run sonar:up` — start the server.
2. Open <http://localhost:9000>, change the admin password.
3. `npm run sonar:scan` once — registers the `joule` project on the server so the gate has something to attach to.
4. Generate a token from an **admin** account (My Account → Security → Tokens).
5. Export it and provision the gate:

   ```bash
   export SONAR_TOKEN=<admin-scoped-token>
   npm run sonar:setup
   ```

After that, every subsequent `npm run sonar:scan` evaluates against the Joule gate. Look in the SonarQube UI under **Projects → Joule → Quality Gate** to confirm it's attached.

#### Auth shortcut for setup

If you haven't generated a token yet (right after first install), `sonar:setup` also accepts admin user + password directly:

```bash
export SONAR_ADMIN_USER=admin
export SONAR_ADMIN_PASS=<password-you-set-at-first-login>
npm run sonar:setup
```

A regular project-scoped token (the kind your scans use) doesn't have permission to create gates, so use an admin token or admin creds for `sonar:setup` specifically.

### Stopping it

```bash
npm run sonar:down
```

Data persists in volumes. To wipe everything, `docker compose -f docker-compose.sonarqube.yml down -v`.

## CI

One workflow — `.github/workflows/sonarqube.yml`. It spins up SonarQube + Postgres inside the runner via the same `docker-compose.sonarqube.yml` you use locally, provisions the Joule quality gate from `scripts/sonar-setup.js`, runs the scan, fails the job if the gate fails, then tears everything down. Same shape as a Java/Gradle pipeline that does `docker run sonarqube:community` and then `./gradlew sonar` against `localhost:9000`.

**No repo secrets or vars required.** The workflow stands up its own SonarQube each run and generates a throwaway admin token via the API.

Triggers:

- **push to main** — every merge to main goes through the gate.
- **workflow_dispatch** — run on demand from the Actions tab.
- **pull_request** — auto-runs on PRs that touch `sonar-project.properties`, `scripts/sonar-setup.js`, the workflow itself, or `docker-compose.sonarqube.yml`. Sonar config changes get validated; PRs that don't touch Sonar config don't burn ~2 min on a boot.

Trade-off: **no persistence**. The SonarQube dashboard only exists during the job. The gate verdict and any failing conditions show up in the job log. Boot adds ~2 min per run; SonarQube + Postgres take about 2 GB of the runner's 7 GB.

If you later want a persistent dashboard (history, clickable links, etc.), self-host SonarQube somewhere reachable (small VPS, your own server, cloudflared tunnel) and rewire the workflow to point at it via `SONAR_HOST_URL` instead of `localhost`. The scanner + setup script don't change — only the host URL.

## What gets scanned

The scope is set in `sonar-project.properties` at the repo root:

- **Sources**: `src/` (the app)
- **Tests**: `src/**/*.test.ts`, `tests/**`
- **Excluded**: types, build output, docs, migrations, Spec-Kit and Claude vendored files
- **Coverage**: read from `coverage/lcov.info` (produced by `npm run test:coverage`)

Edit `sonar-project.properties` if you add a new directory you want included or excluded.

## What was removed

- `SonarCloud` workflow header — replaced with `SonarQube`.
- `sonar.organization` from the properties file — Community Edition has no org concept.
- The "CI-based analysis" SonarCloud setting note — no longer applies.
