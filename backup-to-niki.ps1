<#
.SYNOPSIS
  Backup the Darko working folder to the Niki external drive.

.DESCRIPTION
  Copies C:\Users\hpsbm\Desktop\darko to <Niki>\darko using robocopy with
  mirror semantics (so deletes on the source delete on the target too).
  By default, node_modules / dist / .expo / build artifacts are skipped
  because they're easy to regenerate with `npm install` and just bloat
  the backup. Pass -IncludeNodeModules to include them.

  After the copy:
    - All git history is preserved (.git directory is included)
    - On your laptop, plug Niki in, cd to <Niki>\darko, run `npm install`,
      and you're ready to continue.

.PARAMETER NikiPath
  Drive letter or full path to Niki. If omitted, the script auto-detects
  by volume label. Example: -NikiPath "E:" or -NikiPath "E:\some\folder".

.PARAMETER IncludeNodeModules
  Include node_modules and build outputs. Default: skip them.

.PARAMETER DryRun
  Show what would copy without actually copying.

.EXAMPLE
  .\backup-to-niki.ps1
  Auto-detects Niki, mirrors source to <Niki>\darko, skips node_modules.

.EXAMPLE
  .\backup-to-niki.ps1 -NikiPath "E:"
  Forces target to E:\darko.

.EXAMPLE
  .\backup-to-niki.ps1 -DryRun
  Shows the copy plan without writing anything.
#>

[CmdletBinding()]
param(
    [string]$NikiPath,
    [switch]$IncludeNodeModules,
    [switch]$DryRun
)

$ErrorActionPreference = 'Stop'

function Write-Step($t) { Write-Host "-> $t" -ForegroundColor Cyan }
function Write-Ok($t)   { Write-Host "OK $t" -ForegroundColor Green }
function Write-Skip($t) { Write-Host ".. $t" -ForegroundColor Yellow }
function Write-Warn($t) { Write-Host "!! $t" -ForegroundColor Yellow }

$source = 'C:\Users\hpsbm\Desktop\darko'
if (-not (Test-Path $source)) {
    Write-Error "Source not found: $source"
    exit 1
}

# ── Resolve target ────────────────────────────────────────────────────────────
function Find-NikiDrive {
    # Match volumes whose label contains "niki" (case-insensitive).
    Get-Volume |
        Where-Object { $_.FileSystemLabel -and $_.FileSystemLabel -match '(?i)niki' -and $_.DriveLetter } |
        Sort-Object Size -Descending |
        Select-Object -First 1
}

if (-not $NikiPath) {
    Write-Step 'Auto-detecting Niki drive (volume label match)...'
    $vol = Find-NikiDrive
    if (-not $vol) {
        Write-Error @"
Could not find a drive labeled 'Niki'. Available volumes:
$((Get-Volume | Where-Object { $_.DriveLetter } | Format-Table DriveLetter, FileSystemLabel, @{n='SizeGB';e={[math]::Round($_.Size/1GB,1)}}, @{n='FreeGB';e={[math]::Round($_.SizeRemaining/1GB,1)}} | Out-String))

Re-run with -NikiPath, e.g. .\backup-to-niki.ps1 -NikiPath "E:"
"@
        exit 1
    }
    $NikiPath = "$($vol.DriveLetter):"
    Write-Ok "Found Niki at $NikiPath ($($vol.FileSystemLabel), $([math]::Round($vol.SizeRemaining/1GB,1)) GB free)"
}

# Normalize: if user passed "E:", make it "E:\darko". If they passed a full path, use it as-is.
$target = if ($NikiPath -match '^[A-Za-z]:\\?$') {
    Join-Path $NikiPath 'darko'
} else {
    $NikiPath
}

Write-Step "Source: $source"
Write-Step "Target: $target"

if (-not (Test-Path (Split-Path $target -Parent))) {
    Write-Error "Parent of target doesn't exist: $(Split-Path $target -Parent). Niki not connected?"
    exit 1
}

# Ensure the target folder exists.
if (-not (Test-Path $target)) {
    if (-not $DryRun) { New-Item -ItemType Directory -Path $target -Force | Out-Null }
    Write-Step "Created $target"
}

# ── Build robocopy excludes ───────────────────────────────────────────────────
$excludeDirs = @()
if (-not $IncludeNodeModules) {
    $excludeDirs += @(
        'node_modules',
        'dist',
        '.expo',
        '.next',
        'build',
        'ios',
        'android'
    )
}
# Always exclude these — too big or pointless to back up.
$excludeDirs += @(
    '.cache',
    '.netlify'
)
$excludeFiles = @('*.log', '*.tmp')

$rcArgs = @(
    $source,
    $target,
    '/MIR',          # Mirror — copy + delete what's not on source
    '/Z',            # Restartable mode (resilient to disconnects)
    '/R:2', '/W:2',  # Retry 2x with 2s wait on failures
    '/NP',           # No per-file progress (cleaner output)
    '/NFL',          # No file list
    '/NDL',          # No directory list
    '/MT:8'          # 8 threads
)

if ($excludeDirs.Count -gt 0) {
    $rcArgs += '/XD'
    $rcArgs += $excludeDirs
}
if ($excludeFiles.Count -gt 0) {
    $rcArgs += '/XF'
    $rcArgs += $excludeFiles
}

if ($DryRun) {
    $rcArgs += '/L'  # List only — don't copy
}

# ── Run robocopy ──────────────────────────────────────────────────────────────
Write-Step ($DryRun ? 'Dry run — listing what would copy...' : 'Mirroring (this can take a few minutes)...')
Write-Host "Excluding: $($excludeDirs -join ', ')" -ForegroundColor DarkGray
Write-Host ''

$startedAt = Get-Date
& robocopy @rcArgs

# Robocopy exit codes: 0 = no copy needed, 1 = copies happened, 2 = extra files
# deleted, 3 = (1 + 2), 4-7 = warnings (still success). >=8 = errors.
$rcExit = $LASTEXITCODE
$elapsed = (Get-Date) - $startedAt

Write-Host ''
if ($rcExit -ge 8) {
    Write-Error "robocopy reported errors (exit code $rcExit). Check the output above."
    exit $rcExit
}

# ── Summary ───────────────────────────────────────────────────────────────────
$summary = @"
$(if ($DryRun) { 'Dry run complete.' } else { 'Backup complete.' })
  Time:    $([math]::Round($elapsed.TotalSeconds, 1)) s
  Source:  $source
  Target:  $target
  Exclude: $($excludeDirs -join ', ')
"@
Write-Ok $summary

if (-not $DryRun) {
    # Sanity check — does the checkout look intact at the target?
    if (Test-Path (Join-Path $target 'package.json')) {
        Write-Ok "Checkout mirrored: $target"
        Write-Host ''
        Write-Host 'On the laptop (after plugging Niki in):' -ForegroundColor Cyan
        Write-Host "  cd `"$target`"" -ForegroundColor Cyan
        if (-not $IncludeNodeModules) {
            Write-Host '  npm install                # rebuild node_modules' -ForegroundColor Cyan
        }
        Write-Host '  npx expo start --web       # run dev server' -ForegroundColor Cyan
    } else {
        Write-Warn "package.json not found at the target. Inspect $target."
    }
}
