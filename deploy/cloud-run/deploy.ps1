param(
  [Parameter(Mandatory = $true)]
  [string]$ProjectId,

  [string]$Region = "us-central1",
  [string]$ServiceName = "dropship-control",
  [string]$ArtifactRepo = "dropship-control",
  [string]$ImageTag = "latest",
  [string]$AppUrl = "",
  [string]$CloudSqlInstance = "",
  [string]$ProfileImageBucket = "",
  [switch]$EnableGoogleOAuth,
  [switch]$AllowUnauthenticated
)

$ErrorActionPreference = "Stop"

function Assert-Command($Name) {
  if (-not (Get-Command $Name -ErrorAction SilentlyContinue)) {
    throw "Comando '$Name' nao encontrado. Instale o Google Cloud CLI antes de continuar."
  }
}

function Invoke-Gcloud {
  param(
    [Parameter(ValueFromRemainingArguments = $true)]
    [string[]]$Args
  )

  & $GcloudCommand @Args
  if ($LASTEXITCODE -ne 0) {
    throw "gcloud $($Args -join ' ') falhou com codigo $LASTEXITCODE."
  }
}

$GcloudCommand = "gcloud"
$localGcloud = Join-Path $env:LOCALAPPDATA "Google\Cloud SDK\google-cloud-sdk\bin\gcloud.cmd"

if (Get-Command $GcloudCommand -ErrorAction SilentlyContinue) {
  $GcloudCommand = (Get-Command $GcloudCommand).Source
} elseif (Test-Path $localGcloud) {
  $GcloudCommand = $localGcloud
} else {
  Assert-Command "gcloud"
}

Invoke-Gcloud config set project $ProjectId | Out-Host

Invoke-Gcloud services enable `
  run.googleapis.com `
  artifactregistry.googleapis.com `
  cloudbuild.googleapis.com `
  secretmanager.googleapis.com `
  sqladmin.googleapis.com | Out-Host

$repoExists = $true
& $GcloudCommand artifacts repositories describe $ArtifactRepo --location $Region | Out-Null
if ($LASTEXITCODE -ne 0) {
  $repoExists = $false
}

if (-not $repoExists) {
  Invoke-Gcloud artifacts repositories create $ArtifactRepo `
    --repository-format=docker `
    --location=$Region `
    --description="Imagens Docker do Dropship Control" | Out-Host
}

$image = "$Region-docker.pkg.dev/$ProjectId/$ArtifactRepo/$ServiceName`:$ImageTag"

Invoke-Gcloud builds submit --tag $image . | Out-Host

$envVars = @(
  "NODE_ENV=production",
  "NEXT_TELEMETRY_DISABLED=1",
  "AUTH_TRUST_HOST=true"
)

if ($AppUrl) {
  $envVars += @(
    "APP_URL=$AppUrl",
    "AUTH_URL=$AppUrl",
    "NEXTAUTH_URL=$AppUrl"
  )
}

if ($CloudSqlInstance) {
  $envVars += "INSTANCE_UNIX_SOCKET=/cloudsql/$CloudSqlInstance"
}

if ($ProfileImageBucket) {
  $envVars += "PROFILE_IMAGE_BUCKET=$ProfileImageBucket"
}

$deployArgs = @(
  "run", "deploy", $ServiceName,
  "--image", $image,
  "--region", $Region,
  "--platform", "managed",
  "--port", "3000",
  "--memory", "1Gi",
  "--cpu", "1",
  "--min-instances", "0",
  "--max-instances", "3",
  "--set-env-vars", ($envVars -join ",")
)

if ($CloudSqlInstance) {
  $deployArgs += @(
    "--add-cloudsql-instances", $CloudSqlInstance
  )
}

$secretBindings = @(
  "AUTH_SECRET=auth-secret:latest",
  "DB_USER=db-user:latest",
  "DB_PASS=db-pass:latest",
  "DB_NAME=db-name:latest"
)

if ($EnableGoogleOAuth) {
  $secretBindings += @(
    "AUTH_GOOGLE_ID=auth-google-id:latest",
    "AUTH_GOOGLE_SECRET=auth-google-secret:latest"
  )
}

$deployArgs += @("--set-secrets", ($secretBindings -join ","))

if ($AllowUnauthenticated) {
  $deployArgs += "--allow-unauthenticated"
} else {
  $deployArgs += "--no-allow-unauthenticated"
}

Invoke-Gcloud @deployArgs | Out-Host

Write-Host ""
Write-Host "Deploy solicitado para $ServiceName."
Write-Host "Imagem: $image"
