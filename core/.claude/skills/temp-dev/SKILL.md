---
name: temp-dev
description: Create a temp-dev branch from develop and cherry-pick all commits from a feature branch
disable-model-invocation: true
argument-hint: "[feature-branch-name (defaults to current branch)] [repo]"
allowed-tools: Bash
---

Create a `temp-dev-` branch from `develop` and cherry-pick all feature commits into it.

## Steps

0. **Determine the repository**
   - If no repo argument is included, assume the repo is the current directory

1. **Determine the feature branch name**
   - If `$ARGUMENTS` is provided, use it as the feature branch name
   - Otherwise, use the current branch name (`git branch --show-current`)
   - Validate the branch exists

2. **Get the list of commits to cherry-pick**
   - Run: `git log main..<feature-branch> --oneline --reverse` to get all commits including merges
   - Then exclude any commit whose message matches a main-sync pattern (e.g. "Merge branch 'main'", "Merge remote-tracking branch 'origin/main'") — these bring no new feature work and must be skipped
   - Keep all other merge commits (e.g. PR merges of sub-branches into the feature branch) — these contain real feature work and must be included; cherry-pick them with `-m 1`
   - Show the user the final list and confirm before proceeding

3. **Create the temp-dev branch from develop**
   - Fetch latest: `git fetch origin`
   - Checkout develop and pull: `git checkout develop && git pull origin develop`
   - Create the new branch: `git checkout -b temp-dev-<feature-branch-name>`

4. **Cherry-pick all commits**
   - Cherry-pick each commit in order (oldest first)
   - For regular commits: `git cherry-pick <sha>`
   - For merge commits: `git cherry-pick -m 1 <sha>`
   - If a conflict occurs, stop and clearly explain which commit caused it and what files conflict
   - Do NOT resolve conflicts automatically — report them and wait for the user

5. **Push and create the PR**
   - Push the branch: `git push origin temp-dev-<feature-branch-name>`
   - Create a PR against `develop` using: `gh pr create --base develop --title "temp-dev: <feature-branch-name>" --body "Temp-dev branch cherry-picked from \`<feature-branch-name>\`.\n\n**Commits included:**\n$(git log main..<feature-branch-name> --oneline --no-merges)"`
   - Output the PR URL to the user

6. **Update the JIRA ticket to include the link to the newly created PR**
   - Find the JIRA ticket, it will have the same name as the branch excluding `temp-dev-`
   - The "Develop PR" section is a custom field (`customfield_10053`), NOT part of the description. Do not touch the description.
   - First read the existing field value using `getJiraIssue` with `fields: ["customfield_10053"]` — it returns ADF format JSON
   - The field uses Atlassian Document Format (ADF). When writing, use: `{"version": 1, "type": "doc", "content": [...paragraphs]}`. Format the PR link as a hyperlink: `{"type": "paragraph", "content": [{"type": "text", "text": "Processor: "}, {"type": "text", "text": "<url>", "marks": [{"type": "link", "attrs": {"href": "<url>"}}]}]}`
   - **Never overwrite existing content.** Take the existing `content` array and append a new paragraph node to it. If the field is empty/null, start fresh with a new doc.
   - The new line to append should be e.g. `"Processor: <github-pr-link>"`. If a line for the repo already exists with a PR link, it is likely outdated — leave it and add a new line below.
   - After updating, output the ticket URL to the user: `https://curveroyaltysystems.atlassian.net/browse/<ticket-key>`
