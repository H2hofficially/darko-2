<#
.SYNOPSIS
  Stage, commit, and push the Darko checkout in one step.

.DESCRIPTION
  Reads a commit message from `commit-message.txt` (next to this script),
  runs git add -A / git commit / git push inside the checkout, then deletes
  the message file so the next push has to be set up fresh.

  Claude writes commit-message.txt before each push; you just run:
      .\commit-push.ps1

.PARAMETER Message
  Inline commit message. Overrides the file.

.PARAMETER RepoPath
  Path to the git checkout to commit in. Defaults to the top-level
  Darko checkout.

.PARAMETER NoPush
  Stage and commit but do not push.

.EXAMPLE
  .\commit-push.ps1
  Reads commit-message.txt, commits, pushes.

.EXAMPLE
  .\commit-push.ps1 -Message "fix: tighten toolbar"
  Uses the inline message instead.
#>

[CmdletBinding()]
param(
    [string]$Message,
    [string]$RepoPath = 'C:\Users\hpsbm\Desktop\darko',
    [switch]$NoPush
)

$ErrorActionPreference = 'Stop'

function Write-Step($text) { Write-Host "-> $text" -ForegroundColor Cyan }
function Write-Ok($text)   { Write-Host "OK $text" -ForegroundColor Green }
function Write-Skip($text) { Write-Host ".. $text" -ForegroundColor Yellow }

# Resolve the message: -Message arg wins, else read commit-message.txt next to this script.
$messageFile = Join-Path $PSScriptRoot 'commit-message.txt'
if (-not $Message) {
    if (Test-Path $messageFile) {
        $Message = (Get-Content $messageFile -Raw).TrimEnd()
    } else {
        Write-Error "No -Message argument and no commit-message.txt at $messageFile"
        exit 1
    }
}

if (-not $Message.Trim()) {
    Write-Error 'Commit message is empty.'
    exit 1
}

# Verify checkout exists.
if (-not (Test-Path $RepoPath)) {
    Write-Error "Checkout not found: $RepoPath"
    exit 1
}

Set-Location -Path $RepoPath
Write-Step "Checkout: $RepoPath"

# Confirm git repo.
$gitDir = git rev-parse --git-dir 2>$null
if ($LASTEXITCODE -ne 0) {
    Write-Error "Not a git repository: $RepoPath"
    exit 1
}

$branch = git rev-parse --abbrev-ref HEAD
Write-Step "Branch:   $branch"

# Stage.
Write-Step 'Staging changes (git add -A)...'
git add -A
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

# Anything to commit?
$status = git status --short
if (-not $status) {
    Write-Skip 'Working tree is clean.'

    # Maybe there are local commits ahead of remote — try to push anyway.
    if (-not $NoPush) {
        $ahead = git rev-list --count "@{u}..HEAD" 2>$null
        if ($LASTEXITCODE -eq 0 -and [int]$ahead -gt 0) {
            Write-Step "Pushing $ahead local commit(s)..."
            git push
            if ($LASTEXITCODE -eq 0) { Write-Ok 'Pushed.' } else { exit $LASTEXITCODE }
        } else {
            Write-Skip 'Nothing to push.'
        }
    }
    exit 0
}

Write-Host ''
Write-Host $status
Write-Host ''

# Commit via temp file so multi-line + special chars survive intact.
$tempMsg = [System.IO.Path]::GetTempFileName()
try {
    Set-Content -Path $tempMsg -Value $Message -Encoding UTF8 -NoNewline
    Write-Step 'Committing...'
    git commit -F $tempMsg
    if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
} finally {
    Remove-Item $tempMsg -ErrorAction SilentlyContinue
}

# Push.
if ($NoPush) {
    Write-Skip 'Skipping push (-NoPush).'
} else {
    Write-Step 'Pushing...'
    git push
    if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
    Write-Ok 'Pushed.'
}

# Clear the message file so we don't accidentally reuse it next time.
if (Test-Path $messageFile) {
    Remove-Item $messageFile
    Write-Step 'Cleared commit-message.txt'
}

Write-Host ''
Write-Ok 'Done.'
