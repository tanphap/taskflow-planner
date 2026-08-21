# TaskFlow redesign: check, commit, push, and open a pull request.
# Run from PowerShell:
# powershell -NoProfile -ExecutionPolicy Bypass -File .\run-checks-and-pr.ps1

Set-Location $PSScriptRoot
$ErrorActionPreference = "Stop"

function Step([string]$Label) {
    Write-Host ""
    Write-Host "=== $Label ===" -ForegroundColor Cyan
}

function Assert-LastExit([string]$Message) {
    if ($LASTEXITCODE -ne 0) {
        Write-Host "FAIL: $Message" -ForegroundColor Red
        exit 1
    }
}

Step "1/6 Install dependencies"
corepack pnpm install --frozen-lockfile
Assert-LastExit "pnpm install failed"

Step "2/6 Check TypeScript"
corepack pnpm check
Assert-LastExit "TypeScript check failed"

Step "3/6 Run tests"
corepack pnpm test
Assert-LastExit "Tests failed"

Step "4/6 Build production bundle"
corepack pnpm build
Assert-LastExit "Build failed"

Step "5/6 Check whitespace"
git diff --check
Assert-LastExit "git diff --check failed"

Step "6/6 Verify branch"
$branch = (git branch --show-current).Trim()
Assert-LastExit "Could not read the current branch"
if ($branch -ne "design/claude-inspired-ui") {
    Write-Host "FAIL: Expected design/claude-inspired-ui, found $branch" -ForegroundColor Red
    exit 1
}

Step "Commit frontend redesign"
$allowedFiles = @(
    "client/index.html",
    "client/src/index.css",
    "client/src/pages/Home.tsx",
    "client/src/pages/NotFound.tsx",
    "client/src/components/ui/dialog.tsx"
)

git add -- $allowedFiles
Assert-LastExit "git add failed"

$stagedFiles = @(git diff --cached --name-only)
Assert-LastExit "Could not inspect staged files"
$unexpectedFiles = @($stagedFiles | Where-Object { $_ -notin $allowedFiles })
if ($unexpectedFiles.Count -gt 0) {
    Write-Host "FAIL: Unexpected staged files were found:" -ForegroundColor Red
    $unexpectedFiles | ForEach-Object { Write-Host "  $_" -ForegroundColor Red }
    Write-Host "Unstage those files, then run this script again." -ForegroundColor Yellow
    exit 1
}

$commitMessage = @'
redesign: add warm editorial interface

- Add a parchment, cocoa, terracotta, and sage visual system
- Use Newsreader, DM Sans, and DM Mono typography
- Restyle the login, application shell, product views, dialogs, and 404 page
- Preserve OAuth, tRPC, email privacy, recurrence, Telegram, and locale behavior
- Keep calendar content horizontally scrollable on narrow screens

Co-Authored-By: Claude <noreply@anthropic.com>
'@

git commit -m $commitMessage
Assert-LastExit "git commit failed"

Step "Push feature branch"
git push --set-upstream origin design/claude-inspired-ui
Assert-LastExit "git push failed"

Step "Open pull request"
$pullRequestBody = @'
## Summary

- replaces the former high-contrast Swiss styling with a warm editorial interface
- introduces parchment surfaces, cocoa text, terracotta accents, muted sage support, restrained shadows, and rounded controls
- updates the login page, application shell, authenticated views, dialogs, notification popover, and bilingual 404 page
- keeps TaskFlow branding and all existing application behavior

## Preserved behavior

- Manus OAuth through startLogin()
- all existing tRPC contracts and mutations
- Vietnamese and English language switching
- task and event CRUD, event-from-task prefill, recurrence, reminders, and Vietnamese lunar dates
- Gmail and Microsoft mailbox flows
- Gemini confirmation and acknowledgeUnpaidDataUse opt-in
- Telegram linking, reminders, and delivery history
- IME composition protection in Radix dialogs
- local horizontal scrolling for month and week calendars

## Verification

- corepack pnpm check
- corepack pnpm test
- corepack pnpm build
- git diff --check

Generated with Claude Code.
'@

gh pr create `
    --base main `
    --head design/claude-inspired-ui `
    --title "redesign: warm editorial TaskFlow interface" `
    --body $pullRequestBody
Assert-LastExit "gh pr create failed"

Write-Host ""
Write-Host "Done: checks passed, branch pushed, and pull request opened." -ForegroundColor Green
