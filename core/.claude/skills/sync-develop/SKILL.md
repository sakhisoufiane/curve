---
name: sync-develop
description: Brings develop up to date with main for a given repo. Creates a sync branch off develop, merges main in, preserves protected files (internal package versions), walks through any conflicts, then hands off the push command.
argument-hint: "[path/to/repo (defaults to current directory)]"
allowed-tools: Bash
---

Bring a repo's `develop` up to date with `main` without overwriting develop's own work. The sync branch is based off `develop` — main's delta is applied on top.

## Repo profiles

Each repo has files that must not be overwritten by main's version after the merge:

| Repo name | Protected files |
|---|---|
| `api` | `package.json`, `package-lock.json` |
| `processor` | `package.json`, `package-lock.json` |
| `front_end` | `package.json`, `package-lock.json` |
| `core` | all `packages/*/package.json`, root `package-lock.json` |

Consumer repos (`api`, `processor`, `front_end`) pin `@curveroyaltysystems/*` packages to `-develop.*` pre-release versions in develop — main has stable versions. We restore develop's versions after the merge.

`core` is the monorepo that publishes those packages. Each package under `packages/` carries its own version number in develop that is ahead of main. Source code changes in packages are handled by the merge itself — only `package.json` version numbers need restoring.

If the repo name doesn't match any of the above, tell the user and ask them which profile to apply.

---

## Step 0 — Determine repo path and profile

- If `$ARGUMENTS` is provided, use it as the path. Otherwise use the current working directory.
- Extract the repo name as the last path segment (e.g. `/Users/omar/curve-code/processor` → `processor`).
- Verify it is a git repo: `git -C <path> rev-parse --git-dir`. If this fails, stop and tell the user.
- Match the repo name to a profile. Tell the user: the detected repo, the protected files, and what you're about to do. Ask them to confirm before proceeding.

---

## Step 1 — Pre-flight

Work in the repo directory for all subsequent commands.

1. **Fetch**: `git fetch origin`

2. **Dirty working tree check**: `git status --porcelain`
   - If there are changes, warn the user clearly and ask: "There are uncommitted changes. Stash them and continue, or abort?"
   - If stash: `git stash push -m "sync-develop pre-stash"` — note that they can restore with `git stash pop` later.
   - If abort: stop.

3. **Show the gap**: `git log origin/develop..origin/main --oneline`
   - Print the full list so the user can see what's coming in.
   - If empty: tell the user develop is already up to date with main and stop.
   - Otherwise: "Found N commits in main not in develop."

---

## Step 2 — Create the sync branch

- Get today's date: `date +%Y-%m-%d`
- Base branch name: `sync/main-to-develop-<date>`
- Check if the name is already taken (locally or on remote): `git branch -a | grep "sync/main-to-develop-<date>"`
  - If taken, append `-2`, `-3`, etc. until a free name is found.
- Create it off `origin/develop` (not local develop, to sidestep any local tracking config):
  `git checkout -b <branch-name> origin/develop`

---

## Step 3 — Merge

```bash
git merge origin/main --no-commit --no-ff
```

`--no-commit` stages main's changes without committing, leaving `HEAD` pointing at develop's last commit. This is what makes the protected-file restore in Step 4 safe.

**No conflicts** → proceed to Step 4.

**Conflicts** → run `git diff --name-only --diff-filter=U` to list them, then for each:

- **Protected file**: take develop's version automatically.
  ```bash
  git checkout --ours <file>
  git add <file>
  ```
  Tell the user what you did and why.

- **Code file**: before asking the user to resolve, surface the commit history so they understand why the file differs.

  **Run:**
  ```bash
  BASE=$(git merge-base origin/develop origin/main)
  git log --left-right --cherry $BASE...origin/develop -- <file> --oneline
  git log --left-right --cherry $BASE...origin/main -- <file> --oneline
  ```

  Print the results with clear labels. The `=` prefix means an equivalent patch exists on the other side (same work, cherry-picked or re-applied) — mark these as `[equivalent commit exists in main/develop]`. The `<`/`>` prefix means the commit is unique to that branch — mark these as `[develop only]` or `[main only]`.

  Interpret the pattern for the user in plain language:
  - If develop's commits are a superset of main's (all main commits are `=`, develop has additional `>` commits): say so, and suggest `--ours` is almost certainly correct.
  - If both sides have unique `>` commits: say the branches genuinely diverged and the user needs to manually decide what to keep.
  - If all commits are `=`: the conflict is cosmetic (formatting, whitespace) — suggest taking `--ours`.

  The conflict diff is already visible above from the merge output. Tell the user their options:
  - Take develop's version: `git checkout --ours <file>`
  - Take main's version: `git checkout --theirs <file>`
  - Manually combine: edit the file, then confirm when done

  Wait for the user to confirm their choice, then: `git add <file>`.

After all conflicts are resolved and staged, do **not** run `git merge --continue` — proceed directly to Step 4 and commit manually in Step 6.

---

## Step 4 — Restore protected files

Even when the merge is clean, main's versions of the protected files may be staged. Restore them from `HEAD` (develop's last commit):

**For `api`, `processor`, `front_end`:**
```bash
git checkout HEAD -- package.json package-lock.json
git add package.json package-lock.json
```

**For `core`:**
```bash
for f in $(find packages -maxdepth 2 -name "package.json"); do
  git checkout HEAD -- "$f"
done
git checkout HEAD -- package-lock.json
git add package-lock.json $(find packages -maxdepth 2 -name "package.json")
```

Tell the user which files were restored.

---

## Step 5 — Review

Show the staged summary and full diff:
```bash
git diff --cached --stat
git diff --cached
```

Print both — the stat gives a quick overview, the full diff shows the actual lines changed. Ask: "Does this look right? Package files should show no changes. Everything else is what's coming in from main. Commit? (yes/no)"

If no: tell the user to make their changes in their editor, then re-stage the file with `git add <file>`. Once they confirm they're done, re-run `git diff --cached --stat` and `git diff --cached` and ask again.

---

## Step 5b — Lint check

Run eslint against only the files changed in the merge:

```bash
git diff --name-only HEAD | grep -E '\.(js|ts)$' | xargs npx eslint
```

If there are no JS/TS files changed, skip this step.

If eslint reports errors: print them clearly, tell the user which files are affected, and ask them to fix and re-stage (`git add <file>`) before continuing. Once they confirm, re-run the lint check to verify it's clean.

If eslint reports only warnings (no errors): mention them but don't block — let the user decide whether to fix them.

If eslint passes clean: say so and proceed.

---

## Step 6 — Commit

```bash
git commit -m "chore: sync main into develop"
```

Show the user the resulting short SHA.

---

## Step 7 — Hand off

Print the push command for the user to run themselves — do not run it:

```
git push origin <branch-name>
```

Remind them to open a PR from `<branch-name>` into `develop` once they've reviewed the diff. If they stashed changes earlier, remind them to run `git stash pop`.
