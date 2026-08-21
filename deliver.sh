#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")"

step() { printf '\n=== %s ===\n' "$1"; }

step "Install dependencies"
corepack pnpm install --frozen-lockfile

step "TypeScript check"
corepack pnpm check

step "Test suite"
corepack pnpm test

step "Production build"
corepack pnpm build

step "Whitespace check"
git diff --check

step "Verify feature branch"
branch="$(git branch --show-current)"
if [[ "$branch" != "design/claude-inspired-ui" ]]; then
  printf 'Expected branch design/claude-inspired-ui, found %s\n' "$branch" >&2
  exit 1
fi

allowed=(
  client/index.html
  client/src/index.css
  client/src/pages/Home.tsx
  client/src/pages/NotFound.tsx
  client/src/components/ui/dialog.tsx
)

git add -- "${allowed[@]}"

mapfile -t staged < <(git diff --cached --name-only)
for file in "${staged[@]}"; do
  found=false
  for allowed_file in "${allowed[@]}"; do
    if [[ "$file" == "$allowed_file" ]]; then
      found=true
      break
    fi
  done
  if [[ "$found" == false ]]; then
    printf 'Unexpected staged file: %s\n' "$file" >&2
    exit 1
  fi
done

if [[ ${#staged[@]} -eq 0 ]]; then
  printf 'No frontend changes are staged.\n' >&2
  exit 1
fi

step "Commit redesign"
git commit -F - <<'COMMIT_MESSAGE'
redesign: add warm editorial interface

- Add a parchment, cocoa, terracotta, and sage visual system
- Use Newsreader, DM Sans, and DM Mono typography
- Restyle the login, application shell, product views, dialogs, and 404 page
- Preserve OAuth, tRPC, email privacy, recurrence, Telegram, and locale behavior
- Keep calendar content horizontally scrollable on narrow screens

Co-Authored-By: Claude <noreply@anthropic.com>
COMMIT_MESSAGE

step "Push feature branch"
git push --set-upstream origin design/claude-inspired-ui

step "Open pull request"
existing_url="$(gh pr list --head design/claude-inspired-ui --base main --state open --json url --jq '.[0].url // empty')"
if [[ -n "$existing_url" ]]; then
  printf '%s\n' "$existing_url"
  exit 0
fi

gh pr create \
  --base main \
  --head design/claude-inspired-ui \
  --title "redesign: warm editorial TaskFlow interface" \
  --body-file - <<'PR_BODY'
## Summary

- replaces the former high-contrast Swiss styling with a warm editorial interface
- introduces parchment surfaces, cocoa text, terracotta accents, muted sage support, restrained shadows, and rounded controls
- updates the login page, application shell, authenticated views, dialogs, notification popover, and bilingual 404 page
- keeps TaskFlow branding and existing application behavior

## Preserved behavior

- Manus OAuth through `startLogin()`
- existing tRPC contracts and mutations
- Vietnamese and English language switching
- task and event CRUD, event-from-task prefill, recurrence, reminders, and Vietnamese lunar dates
- Gmail and Microsoft mailbox flows
- Gemini confirmation and `acknowledgeUnpaidDataUse` opt-in
- Telegram linking, reminders, and delivery history
- IME composition protection in Radix dialogs
- local horizontal scrolling for month and week calendars

## Verification

- `corepack pnpm check`
- `corepack pnpm test`
- `corepack pnpm build`
- `git diff --check`

🤖 Generated with [Claude Code](https://claude.com/claude-code)
PR_BODY
