# Team Skills

Skills are AI agent instructions that live in `.claude/skills/` and extend Claude Code with project-specific workflows. When you trigger a skill (by typing its slash command or describing the task), Claude follows a detailed, tested playbook instead of improvising.

## How to use a skill

Type the skill name as a slash command in Claude Code, optionally followed by arguments:

```
/mocha-to-jest test/unit/libs/sftp.test.js
/temp-dev CUR-1234-my-feature api
```

Some skills auto-trigger when you describe what you want — see each skill's trigger phrases below.

---

## Available skills

### `angular-to-react`

Migrates an AngularJS 1.x page (controller + template) from the `front_end` repo
to a React page in `apps/curve-app`. Builds the API layer, hooks, page
component(s), route registration, and i18n namespace following the conventions
below.

**Trigger phrases** — Claude will auto-invoke this skill when you say things like:

- "migrate this angular page"
- "convert this controller to react"
- Reference a controller file and mention React or migration

**Usage:**

```
/angular-to-react <path-to-angular-controller-file>
```

**What it does:**

1. Resolves your `front_end` repo location (infers from the path, falls back to
   the `../front_end` sibling, or asks you — no hardcoded machine paths)
2. Reads the controller, template, services, and route, then reports a summary
   and waits for confirmation
3. Greps the React app for existing equivalents so it only builds what's missing
4. Creates the API layer, query/mutation hooks, page-logic hook, page
   component(s), registers the route(s), and adds an i18n namespace
5. Runs `npm run typecheck` and fixes every error before reporting back

**Page-structure conventions it follows** (these mirror the `works` /
`companies` / `clients` pages):

- **Data/state hooks live in `apps/curve-app/src/hooks/<domain>/`** (top-level),
  alongside the domain's query and mutation hooks — *not* in a page-local
  `pages/<domain>/hooks/` folder. Match the existing domain folder name
  (`hooks/works/`, `hooks/companies/`, or the singular `hooks/client/`).
- **Page-local `utils/`** holds the column defs (`<domain>.columns.tsx`),
  `<domain>.constants.ts`, `<domain>.mapper.ts`, and `<domain>.filters.ts`.
- **Edit + New are one `edit.tsx` component** mounted at both `/<domain>/new`
  and `/<domain>/:id/edit`, branching on `isNew = !id` (see `pages/works/edit.tsx`).
- **Each domain gets its own i18n namespace file**
  (`packages/i18n/src/locales/en/<domain>.json`) with flat keys, wired into
  `en/index.ts` and the `ns` array in `i18n.ts`, and consumed via
  `useTranslation('<domain>')` — page strings never go in `common.json`.

---

### `mocha-to-jest`

Migrates a single test file from Mocha/Chai/Sinon to Jest. Handles API translation, output path derivation, file moves, completeness validation, and running the migrated tests.

**Trigger phrases** — Claude will auto-invoke this skill when you say things like:

- "migrate this test"
- "convert this file to Jest"
- Reference a specific test file and mention Jest or Mocha

**Usage:**

```
/mocha-to-jest <path-to-mocha-test-file>
```

**What it does:**

1. Reads and analyses the Mocha file (hooks, assertions, stubs, `done` callbacks)
2. Confirms the plan with you before making any changes
3. Derives the correct output path — Jest tests live **next to their source file**, not in `test/`
4. Moves the source file into its own folder if needed, and creates an `index.js` re-export so existing imports keep working
5. Writes the new Jest file with all API replacements applied
6. Validates that no `describe`/`it` blocks were dropped
7. Runs the new file with `npx jest --no-coverage` and fixes any failures
8. Marks the original Mocha file as `.skip` so it stops running under the old runner

---

### `temp-dev`

Creates a `temp-dev-` branch from `develop`, cherry-picks all feature commits into it, opens a PR against `develop`, and links the PR to the Jira ticket.

Use this when a feature branch PR to `main` has been approved and you now want to deploy it to `develop`.

**Usage:**

```
/temp-dev                                  # uses current branch, current repo
/temp-dev CUR-1234-my-feature              # explicit branch name
/temp-dev CUR-1234-my-feature api          # explicit branch + repo directory
```

**What it does:**

1. Identifies the feature branch (current branch or the one you pass)
2. Lists all commits to cherry-pick, excluding main-sync merges, and asks you to confirm
3. Checks out `develop`, pulls latest, and creates `temp-dev-<feature-branch-name>`
4. Cherry-picks each commit in order — stops and reports clearly if there's a conflict
5. Pushes the branch and opens a PR against `develop` via `gh`
6. Finds the matching Jira ticket and appends the new PR link to the "Develop PR" custom field (never overwrites existing content)

**Example:**

```
/temp-dev CUR-5678-royalty-export
```

Claude will:

- Show you the commits it plans to cherry-pick and ask for confirmation
- Create `temp-dev-CUR-5678-royalty-export` from `develop`
- Open a PR and give you the URL
- Update `https://curveroyaltysystems.atlassian.net/browse/CUR-5678` with the PR link

---

### `sync-develop`

Brings a repo's `develop` branch up to date with `main`. Creates a sync branch off develop, merges main in with `--no-commit`, preserves internal package version numbers (and for `core`, all `packages/*/package.json` versions), walks you through any conflicts, then hands off the push command.

Works across all four repos: `api`, `processor`, `front_end`, `core`.

**Usage:**

```
/sync-develop                          # uses current directory
/sync-develop /path/to/api             # explicit repo path
```

**What it does:**

1. Detects the repo from the path and loads the right protected-file profile
2. Fetches latest, checks for a dirty tree, shows you the gap (commits in main not in develop)
3. Creates `sync/main-to-develop-<date>` off `origin/develop`
4. Merges `origin/main --no-commit --no-ff` — for conflicts in protected files it auto-takes develop's version; for code conflicts it walks you through them
5. Restores protected files from HEAD so package versions are never overwritten
6. Shows the staged diff and asks you to confirm before committing
7. Commits and prints the `git push` command for you to run

---

## Adding a new skill

1. Create a folder under `.claude/skills/<skill-name>/`
2. Add a `SKILL.md` with a YAML frontmatter block (`name`, `description`, `allowed-tools`) and the instructions for Claude
3. Optionally add an `examples/` folder with before/after files and a `references/` folder with supporting docs
4. Update this README with the new skill's description and usage

Skill descriptions in the frontmatter control when Claude auto-invokes the skill — write them to match the natural phrases a dev would use when asking for help with that task.
