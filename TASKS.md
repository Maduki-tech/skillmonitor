# skillmonitor tasks

Goal: count how often each agent skill is used, over 1 / 7 / 30 / 90 / 180 days.
Scope now: Claude Code only. The `agent` column keeps the door open for other harnesses.

Each task is small, ends in a check you can run yourself, and gets its own commit.
We do one task at a time. Ask "why" and "how" at any point before moving on.

Toolchain on this machine: Bun 1.3.14, sqlite3, git, Claude Code 2.1.288.

## Why a database at all

Claude Code already logs every Skill call in `~/.claude/projects/*.jsonl`, but deletes those
transcripts after 30 days by default (`cleanupPeriodDays`). The 90 and 180 day windows need
our own copy. That copy is one SQLite table.

## Architecture

```
Claude Code ──(mod: skill.prompt)──> skillmon record ──> events table ──> skillmon stats
                                                         skill folders ──┘ (zero-use rows)
```

```
src/db.ts    open, record(), stats()
src/cli.ts   skillmon record | stats
mod/         Claude Code adapter
```

```sql
events(skill TEXT, agent TEXT, ts INTEGER)
```

---

## Task 0. Skeleton

- `git init`, `bun init`, delete what `bun init` adds that we don't use.
- Done when: the first commit exists.

## Task 1. Store and count

- `src/db.ts`: open `~/.local/share/skillmon/events.db`, create `events`, set `busy_timeout`
  so two sessions writing at once wait instead of failing.
- `record()`: plain `INSERT`, plugin prefix stripped (`pstack:poteto-mode` → `poteto-mode`).
- `stats(now)`: one query, one `SUM(ts > now - window)` per window, grouped by skill.
- One test: fixed `now`, events on both sides of each window edge.
- Learn: events vs counters, why `now` is a parameter.
- Done when: `bun test` passes.

## Task 2. CLI

- `src/cli.ts`: `record <skill> --agent <name>` and `stats`. Validation lives here, not in `db.ts`.
- `#!/usr/bin/env bun` on line 1, symlinked as `~/.local/bin/skillmon`.
- Done when: `skillmon record x --agent manual && skillmon stats` shows `x` with 1 everywhere.

## Task 3. Claude Code mod

- `mod/`: `plugin.json`, `hooks.json`, `register.ts`.
- On `skill.prompt`, run `skillmon record <skill> --agent claude-code` via `$.process`.
- Learn: how mods load, why `skill.prompt` beats a `PreToolUse` hook (it also sees `/name` you type).
- Done when: typing `/some-skill` and a model Skill call each add 1 in `skillmon stats`.

## Task 4. Zero-use skills

- `stats` lists the skill folders (`~/.claude/skills/*`, `~/.claude/plugins/cache/**/skills/*`)
  and adds any skill with no events as a row of zeros. No table, no `scan` command.
- Done when: a skill you never called shows up with all zeros.

## Task 5. Install permanently

- Move the mod from the dev folder to an installed plugin so every session loads it.
- Done when: a fresh Claude Code session records skill use with nothing extra to run.

---

## Cut, with the trigger to add it back

- `id` column: the mod's `skill.prompt` event carries no id to dedupe on. Add it back with backfill.
- Transcript backfill: oldest local transcript is 3 days old, so it buys almost nothing. Add if a
  machine with long `cleanupPeriodDays` shows up.
- `session` / `project` columns: no view asks for them. Add with the view that does.
- `skills` table and `scan` command: reading folders at `stats` time is enough. Add if it gets slow.
- Pane inside Claude Code, other harness adapters, sync server: after Task 5 is in daily use.
