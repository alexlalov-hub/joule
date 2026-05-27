# Specs

One folder per feature, numbered. Each holds the three GitHub Spec-Kit documents:

- **`spec.md`** — what to build. Goal, user stories, acceptance criteria. No code, no tech.
- **`plan.md`** — how to build it. File paths, schema changes, components, trade-offs. No commands.
- **`tasks.md`** — the punch-list. Ordered, small enough to land in one commit each.
- **`checklists/requirements.md`** — auto-generated spec-quality gate per Spec-Kit's `/speckit-specify` flow.

Sprint 1 (Weeks 1–4) was test-driven with experiments as evidence. Sprint 2 (Week 5+) added the Spec-Kit shape on top. The comparison ("with vs without spec-first") is part of the Week 8 synthesis.

## Tooling

The project uses GitHub's [Spec-Kit](https://github.com/github/spec-kit) CLI, installed via `uv tool install specify-cli --from git+https://github.com/github/spec-kit.git`. The CLI scaffolded `.specify/` (templates, scripts, constitution), `CLAUDE.md` (agent context pointer), and `.claude/skills/speckit-*` (slash commands). The same slash commands work for the GitHub Copilot, Codex, Gemini, etc. integrations — Joule uses Claude.

The five Spec-Kit phases:

1. `/speckit-constitution` — fills `.specify/memory/constitution.md` with project principles. Done at Sprint 2 start.
2. `/speckit-specify` — creates `specs/NNN-short-name/spec.md` from a feature description.
3. `/speckit-plan` — generates `plan.md` from the spec.
4. `/speckit-tasks` — generates `tasks.md` from the plan.
5. `/speckit-implement` — executes the tasks.

When the slash commands aren't reachable (e.g. mid-session install), the same artifacts are produced manually by copying `.specify/templates/*.md` into the feature folder and filling them in. The contract is the folder shape, not the CLI invocation.

## Convention

- Feature folders are zero-padded sequential: `001-...`, `002-...`, `003-...`. The `create-new-feature.sh` script in `.specify/scripts/bash/` picks the next number automatically.
- One feature per folder. If a feature spawns sub-features, each gets its own folder.
- The feature folder's name is independent of the git branch name. Joule keeps the per-week branch (`week-NN-<theme>`) and creates one or more `specs/NNN-*` folders inside the same branch.
