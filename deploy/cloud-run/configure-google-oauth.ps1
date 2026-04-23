param(
  [Parameter(Mandatory = $true)]
  [string]$ClientId,

  [Parameter(Mandatory = $true)]
  [string]$ClientSecret,

  [string]$ProjectId = "dropcontrol-494022",
  [string]$Region = "us-central1",
  [string]$ServiceName = "dropship-control",
  [string]$AppUrl = "https://dropship-control-rwquuxvh6a-uc.a.run.app"
)

$ErrorActionPreference = "Stop"

$gcloud = "gcloud"
$localGcloud = Join-Path $env:LOCALAPPDATA "Google\Cloud SDK\google-cloud-sdk\bin\gcloud.cmd"

if (Get-Command $gcloud -ErrorAction SilentlyContinue) {
  $gcloud = (Get-Command $gcloud).Source
} elseif (Test-Path $localGcloud) {
  $gcloud = $localGcloud
}

function Invoke-Gcloud {
  param(
    [Parameter(ValueFromRemainingArguments = $true)]
    [string[]]$Args
  )

  & $gcloud @Args
  if ($LASTEXITCODE -ne 0) {
    throw "gcloud $($Args -join ' ') falhou com codigo $LASTEXITCODE."
  }
}

function Set-SecretValue {
  param(
    [Parameter(Mandatory = $true)]
    [string]$Name,

    [Parameter(Mandatory = $true)]
    [string]$Value
  )

  $exists = $true
  & $gcloud secrets describe $Name --project $ProjectId --format "value(name)" *> $null
  if ($LASTEXITCODE -ne 0) {
    $exists = $false
  }

  $tempFile = New-TemporaryFile
  try {
    Set-Content -LiteralPath $tempFile -Value $Value -NoNewline

    if ($exists) {
      Invoke-Gcloud secrets versions add $Name --project $ProjectId --data-file $tempFile
    } else {
      Invoke-Gcloud secrets create $Name --project $ProjectId --replication-policy automatic --data-file $tempFile
    }
  } finally {
    Remove-Item -LiteralPath $tempFile -Force -ErrorAction SilentlyContinue
  }
}

Set-SecretValue -Name "auth-google-id" -Value $ClientId
Set-SecretValue -Name "auth-google-secret" -Value $ClientSecret

Invoke-Gcloud run services update $ServiceName `
  --region $Region `
  --project $ProjectId `
  --update-secrets "AUTH_GOOGLE_ID=auth-google-id:latest,AUTH_GOOGLE_SECRET=auth-google-secret:latest" `
  --update-env-vars "APP_URL=$AppUrl,AUTH_URL=$AppUrl,NEXTAUTH_URL=$AppUrl,AUTH_TRUST_HOST=true"

Write-Host ""
Write-Host "Google OAuth habilitado para $ServiceName."
Write-Host "Redirect URI: $AppUrl/api/auth/callback/google"
