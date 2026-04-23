param(
  [Parameter(Mandatory = $true)]
  [string]$ProjectId,

  [string]$Region = "us-central1",
  [string]$ServiceName = "dropship-control",
  [string]$ArtifactRepo = "dropship-control",
  [string]$ImageTag = "latest",
  [string]$MigrationJobName = "",
  [string]$AppUrl = "",
  [string]$CloudSqlInstance = "",
  [string]$ProfileImageBucket = "",
  [string]$ServiceAccount = "",
  [switch]$EnableGoogleOAuth,
  [switch]$EnableTikTokShop,
  [switch]$AllowUnauthenticated,
  [switch]$SkipMigrations,
  [switch]$SkipBuild
)

$ErrorActionPreference = "Stop"
if (Test-Path Variable:\PSNativeCommandUseErrorActionPreference) {
  $PSNativeCommandUseErrorActionPreference = $false
}

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

function Test-Gcloud {
  param(
    [Parameter(ValueFromRemainingArguments = $true)]
    [string[]]$Args
  )

  $previousErrorActionPreference = $ErrorActionPreference
  $ErrorActionPreference = "Continue"
  try {
    & $GcloudCommand @Args 1>$null 2>$null
    $commandSucceeded = $LASTEXITCODE -eq 0
  } finally {
    $ErrorActionPreference = $previousErrorActionPreference
  }

  return $commandSucceeded
}

function Get-ProjectNumber {
  $projectNumber = & $GcloudCommand projects describe $ProjectId --format "value(projectNumber)"
  if ($LASTEXITCODE -ne 0 -or -not $projectNumber) {
    throw "Nao foi possivel descobrir o numero do projeto $ProjectId."
  }

  return $projectNumber.Trim()
}

function Ensure-ProfileImageBucket {
  param(
    [Parameter(Mandatory = $true)]
    [string]$BucketName
  )

  $bucketUri = "gs://$BucketName"
  $exists = Test-Gcloud storage buckets describe $bucketUri --project $ProjectId

  if (-not $exists) {
    Invoke-Gcloud storage buckets create $bucketUri `
      --project $ProjectId `
      --location $Region `
      --uniform-bucket-level-access `
      --public-access-prevention | Out-Host
  }

  $runtimeServiceAccount = $ServiceAccount
  if (-not $runtimeServiceAccount) {
    $projectNumber = Get-ProjectNumber
    $runtimeServiceAccount = "$projectNumber-compute@developer.gserviceaccount.com"
  }

  Invoke-Gcloud storage buckets add-iam-policy-binding $bucketUri `
    --member "serviceAccount:$runtimeServiceAccount" `
    --role "roles/storage.objectUser" | Out-Host
}

function Upsert-MigrationJob {
  param(
    [Parameter(Mandatory = $true)]
    [string]$JobName,

    [Parameter(Mandatory = $true)]
    [string]$Image
  )

  $jobArgs = @(
    "--image", $Image,
    "--region", $Region,
    "--project", $ProjectId,
    "--tasks", "1",
    "--max-retries", "0",
    "--set-env-vars", ($envVars -join ","),
    "--set-secrets", ($secretBindings -join ",")
  )

  if ($CloudSqlInstance) {
    $jobArgs += @("--set-cloudsql-instances", $CloudSqlInstance)
  }

  if ($ServiceAccount) {
    $jobArgs += @("--service-account", $ServiceAccount)
  }

  $jobExists = Test-Gcloud run jobs describe $JobName --region $Region --project $ProjectId

  if ($jobExists) {
    Invoke-Gcloud run jobs update $JobName @jobArgs | Out-Host
  } else {
    Invoke-Gcloud run jobs create $JobName @jobArgs | Out-Host
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

$repoExists = Test-Gcloud artifacts repositories describe $ArtifactRepo --location $Region

if (-not $repoExists) {
  Invoke-Gcloud artifacts repositories create $ArtifactRepo `
    --repository-format=docker `
    --location=$Region `
    --description="Imagens Docker do Dropship Control" | Out-Host
}

$image = "$Region-docker.pkg.dev/$ProjectId/$ArtifactRepo/$ServiceName`:$ImageTag"
$migratorImage = "$Region-docker.pkg.dev/$ProjectId/$ArtifactRepo/$ServiceName-migrator`:$ImageTag"

$cloudBuildConfig = Join-Path $PSScriptRoot "cloudbuild.yaml"
if (-not $SkipBuild) {
  Invoke-Gcloud builds submit `
    --config $cloudBuildConfig `
    --substitutions "_APP_IMAGE=$image,_MIGRATOR_IMAGE=$migratorImage" `
    . | Out-Host
} else {
  Write-Host "Build ignorado. Usando imagens existentes:"
  Write-Host "App: $image"
  Write-Host "Migrator: $migratorImage"
}

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
  Ensure-ProfileImageBucket -BucketName $ProfileImageBucket
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

if ($ServiceAccount) {
  $deployArgs += @(
    "--service-account", $ServiceAccount
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

if ($EnableTikTokShop) {
  $secretBindings += @(
    "TIKTOK_SHOP_APP_KEY=tiktok-shop-app-key:latest",
    "TIKTOK_SHOP_APP_SECRET=tiktok-shop-app-secret:latest",
    "TIKTOK_SHOP_TOKEN_SECRET=tiktok-shop-token-secret:latest",
    "TIKTOK_SHOP_WEBHOOK_SECRET=tiktok-shop-webhook-secret:latest"
  )
}

$deployArgs += @("--set-secrets", ($secretBindings -join ","))

if (-not $MigrationJobName) {
  $MigrationJobName = "$ServiceName-migrate"
}

Upsert-MigrationJob -JobName $MigrationJobName -Image $migratorImage

if (-not $SkipMigrations) {
  Invoke-Gcloud run jobs execute $MigrationJobName `
    --region $Region `
    --project $ProjectId `
    --wait | Out-Host
}

if ($AllowUnauthenticated) {
  $deployArgs += "--allow-unauthenticated"
} else {
  $deployArgs += "--no-allow-unauthenticated"
}

Invoke-Gcloud @deployArgs | Out-Host

Write-Host ""
Write-Host "Deploy solicitado para $ServiceName."
Write-Host "Imagem: $image"
Write-Host "Job de migrations: $MigrationJobName"
Write-Host "Imagem de migrations: $migratorImage"
