<#
ImageGuard Studio — optional first-time GitHub publishing helper for Windows.
READ THIS SCRIPT BEFORE RUNNING. It will create a PUBLIC GitHub repository,
commit this local folder, push it, and attempt to turn on GitHub Pages.
Requires Git and GitHub CLI (`gh`) already installed and authenticated.
No private keys or photos should be stored in this source folder.

Usage (from the project folder):
  gh auth login
  powershell -ExecutionPolicy RemoteSigned -File .\scripts\publish-github.ps1
#>
param([string]$RepositoryName = 'imageguard-studio')
$ErrorActionPreference = 'Stop'
if (-not (Get-Command git -ErrorAction SilentlyContinue)) { throw 'Git is not installed. Install Git for Windows first.' }
if (-not (Get-Command gh -ErrorAction SilentlyContinue)) { throw 'GitHub CLI (gh) is not installed. Run: winget install GitHub.cli' }

& gh auth status
if ($LASTEXITCODE -ne 0) { throw 'Run gh auth login, then run this script again.' }

Push-Location (Join-Path $PSScriptRoot '..')
try {
    if (-not (Test-Path '.git')) {
        & git init
        if ($LASTEXITCODE -ne 0) { throw 'git init failed' }
    }
    $configuredOrigin = (& git remote get-url origin 2>$null)
    if ($configuredOrigin -and $configuredOrigin -notin @('https://github.com/me-vishnurnair/imageguard-studio', 'https://github.com/me-vishnurnair/imageguard-studio.git')) { throw 'Unexpected origin. Stop and inspect it before publishing.' }
    if ($RepositoryName -ne 'imageguard-studio') { throw 'This helper is restricted to imageguard-studio.' }
    & git branch -M main
    & git add .
    if ($LASTEXITCODE -ne 0) { throw 'git add failed' }
    & git diff --cached --quiet
    if ($LASTEXITCODE -ne 0) {
        & git commit -m 'Build ImageGuard Studio v1'
        if ($LASTEXITCODE -ne 0) { throw 'Commit failed. Configure git user.name and user.email, then rerun.' }
    }

    $login = (& gh api user --jq '.login').Trim()
    if ($LASTEXITCODE -ne 0 -or -not $login) { throw 'Could not get your GitHub login.' }
    if ($login -ne 'me-vishnurnair') { throw 'Sign in to me-vishnurnair to publish this project.' }
    $fullName = "$login/$RepositoryName"
    & gh repo view $fullName --json name --jq '.name' 2>$null | Out-Null
    $exists = ($LASTEXITCODE -eq 0)
    if (-not $exists) {
        Write-Host "Creating a PUBLIC repository: $fullName"
        & gh repo create $fullName --public --source . --remote origin --push
        if ($LASTEXITCODE -ne 0) { throw 'Repository create/push failed.' }
    } else {
        Write-Host "Repository already exists: $fullName"
        & git remote get-url origin 2>$null | Out-Null
        if ($LASTEXITCODE -ne 0) { & git remote add origin "https://github.com/$fullName.git" }
        & git push -u origin main
        if ($LASTEXITCODE -ne 0) { throw 'Push failed. Confirm the origin remote points to your ImageGuard repository.' }
    }

    Write-Host 'Attempting to enable GitHub Pages GitHub Actions mode...'
    & gh api -X POST "repos/$fullName/pages" -f 'build_type=workflow' 2>$null | Out-Null
    if ($LASTEXITCODE -ne 0) {
        Write-Warning 'Pages may already exist or your token may lack Pages administration permission.'
        Write-Warning 'Open Settings > Pages > Build and deployment > Source > GitHub Actions.'
    }
    & gh workflow run pages.yml --repo $fullName
    if ($LASTEXITCODE -ne 0) { Write-Warning 'Workflow dispatch was not confirmed. A push to main also triggers it.' }
    Write-Host "Code: https://github.com/$fullName"
    Write-Host "Expected website after successful Pages deployment: https://$login.github.io/$RepositoryName/"
    Write-Host 'Check the Actions tab for actual deployment status. A URL is not proof of deployment.'
} finally { Pop-Location }
