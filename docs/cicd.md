# CI/CD

O deploy automatico usa GitHub Actions com Workload Identity Federation, sem chave JSON.

## Fluxo

- Pull request para `main`: roda `npm ci`, `npm run lint` e `npm run build`.
- Push em `main`: roda checks e, se `ENABLE_CLOUD_RUN_DEPLOY=true`, faz deploy no Cloud Run.
- Deploy: Cloud Build cria imagens `runner` e `migrator`, o Cloud Run Job roda migrations, e o servico recebe a nova revisao.

## Google Cloud configurado

Projeto:

```txt
dropcontrol-494022
```

Service account:

```txt
github-actions-deployer@dropcontrol-494022.iam.gserviceaccount.com
```

Workload Identity Provider:

```txt
projects/490152629905/locations/global/workloadIdentityPools/github-actions/providers/dropcontrol
```

Repositorio autorizado:

```txt
MarlonPasseri/DropControl
```

## Configurar GitHub

Em `GitHub > Repository > Settings > Secrets and variables > Actions`, crie estes secrets:

```txt
GCP_WORKLOAD_IDENTITY_PROVIDER=projects/490152629905/locations/global/workloadIdentityPools/github-actions/providers/dropcontrol
GCP_SERVICE_ACCOUNT=github-actions-deployer@dropcontrol-494022.iam.gserviceaccount.com
```

Crie esta variable para ligar o deploy automatico:

```txt
ENABLE_CLOUD_RUN_DEPLOY=true
```

As demais variables sao opcionais porque o workflow ja tem os valores atuais como padrao:

```txt
GCP_PROJECT_ID=dropcontrol-494022
GCP_REGION=us-central1
CLOUD_RUN_SERVICE=dropship-control
CLOUD_SQL_INSTANCE=project-a7ab51c3-7d7a-4f8b-a6b:us-central1:drop-controler-db
PROFILE_IMAGE_BUCKET=dropcontrol-494022-profile-images
APP_URL=https://dropship-control-rwquuxvh6a-uc.a.run.app
ENABLE_TIKTOK_SHOP=false
```

Use `ENABLE_TIKTOK_SHOP=true` somente depois que todos os secrets TikTok tiverem versao `latest` no Secret Manager.

## Deploy manual

O workflow tambem aparece em `Actions > Cloud Run CI/CD > Run workflow`.

O parametro `skip_migrations` pula o Cloud Run Job de migrations quando necessario.
