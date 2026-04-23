# Deploy no Cloud Run

Este e o primeiro caminho recomendado para tirar o app do ambiente local. O banco ja esta no Cloud SQL; o proximo passo e rodar o Next.js como container no Cloud Run.

## Pre-requisitos

- Instalar o Google Cloud CLI (`gcloud`) na maquina ou usar o Cloud Shell.
- Ter um projeto Google Cloud com billing ativo.
- Ter uma instancia Cloud SQL PostgreSQL criada.
- Ter o banco `dropcontrol` e usuario `dropcontrol` funcionando.
- Ter os secrets no Secret Manager.

Neste PC, o `gcloud` ainda nao esta instalado. Sem ele, o deploy real precisa ser feito pelo Cloud Shell ou depois de instalar o CLI localmente.

## Arquitetura inicial

- Cloud Run roda o container Next.js.
- Cloud SQL fica como banco gerenciado.
- Secret Manager guarda credenciais.
- Artifact Registry guarda a imagem Docker.
- Cloud Run se conecta ao Cloud SQL pela integracao gerenciada de Cloud SQL, usando socket Unix em `/cloudsql/INSTANCE_CONNECTION_NAME`.

O app aceita dois modos de conexao:

- `DATABASE_URL`: bom para desenvolvimento local e diagnostico.
- `DB_USER`, `DB_PASS`, `DB_NAME`, `INSTANCE_UNIX_SOCKET`: recomendado no Cloud Run com a conexao gerenciada ao Cloud SQL.

## Criar secrets

Use nomes padronizados:

```bash
auth-secret
auth-google-id
auth-google-secret
db-user
db-pass
db-name
tiktok-shop-app-key
tiktok-shop-app-secret
tiktok-shop-token-secret
tiktok-shop-webhook-secret
```

Exemplo:

```bash
printf "dropcontrol" | gcloud secrets create db-user --data-file=-
printf "SENHA_DO_BANCO" | gcloud secrets create db-pass --data-file=-
printf "dropcontrol" | gcloud secrets create db-name --data-file=-
```

Para secrets que ja existem:

```bash
printf "novo-valor" | gcloud secrets versions add db-pass --data-file=-
```

## Descobrir o instance connection name

```bash
gcloud sql instances describe NOME_DA_INSTANCIA --format="value(connectionName)"
```

O valor tem este formato:

```txt
PROJECT_ID:REGION:INSTANCE_ID
```

## Deploy

Depois de instalar/autenticar o `gcloud`, rode:

```powershell
.\deploy\cloud-run\deploy.ps1 `
  -ProjectId "SEU_PROJECT_ID" `
  -Region "us-central1" `
  -ServiceName "dropship-control" `
  -CloudSqlInstance "PROJECT_ID:REGION:INSTANCE_ID" `
  -ProfileImageBucket "NOME_DO_BUCKET_DE_FOTOS" `
  -AppUrl "https://URL_DO_CLOUD_RUN_OU_DOMINIO" `
  -EnableGoogleOAuth `
  -AllowUnauthenticated
```

O script:

- habilita APIs necessarias;
- cria o Artifact Registry se ainda nao existir;
- envia o build para o Cloud Build;
- faz deploy no Cloud Run;
- conecta o Cloud Run ao Cloud SQL;
- injeta secrets do Secret Manager.

## Uploads de perfil

Em Cloud Run, arquivos gravados no container nao sao persistentes. Por isso, fotos de perfil devem usar Cloud Storage.

Crie um bucket privado e permita que a service account do Cloud Run leia/escreva objetos:

```bash
gcloud storage buckets create gs://NOME_DO_BUCKET_DE_FOTOS \
  --project=PROJECT_ID \
  --location=us-central1 \
  --uniform-bucket-level-access \
  --public-access-prevention

gcloud storage buckets add-iam-policy-binding gs://NOME_DO_BUCKET_DE_FOTOS \
  --member="serviceAccount:PROJECT_NUMBER-compute@developer.gserviceaccount.com" \
  --role="roles/storage.objectUser"
```

Depois configure no Cloud Run:

```bash
gcloud run services update dropship-control \
  --project=PROJECT_ID \
  --region=us-central1 \
  --update-env-vars=PROFILE_IMAGE_BUCKET=NOME_DO_BUCKET_DE_FOTOS
```

O bucket fica privado. O app entrega as imagens pela rota autenticada `/api/profile-image/...`.

## Migrations

Por enquanto, rode migrations localmente contra o Cloud SQL:

```bash
npm run db:check
npm run db:migrate:deploy
```

O proximo incremento e criar um Cloud Run Job dedicado para migrations, usando o mesmo container e secrets.

## OAuth e dominio

Quando tiver a URL publica do Cloud Run ou dominio proprio, atualize:

```env
APP_URL="https://app.seudominio.com"
AUTH_URL="https://app.seudominio.com"
NEXTAUTH_URL="https://app.seudominio.com"
AUTH_TRUST_HOST="true"
```

No Google OAuth, adicione:

```txt
https://app.seudominio.com/api/auth/callback/google
```

Para a URL atual do Cloud Run, use:

```txt
Authorized JavaScript origin:
https://dropship-control-rwquuxvh6a-uc.a.run.app

Authorized redirect URI:
https://dropship-control-rwquuxvh6a-uc.a.run.app/api/auth/callback/google
```

Depois de criar o OAuth Client no Google Cloud Console, aplique o Client ID/Secret:

```powershell
.\deploy\cloud-run\configure-google-oauth.ps1 `
  -ClientId "SEU_CLIENT_ID.apps.googleusercontent.com" `
  -ClientSecret "SEU_CLIENT_SECRET"
```

Esse comando grava `auth-google-id` e `auth-google-secret` no Secret Manager e atualiza o Cloud Run para habilitar o provider do Google.

## Pendencias antes de cliente real

- Mover uploads de perfil para Cloud Storage.
- Criar Cloud Run Job para migrations.
- Configurar dominio proprio e HTTPS gerenciado.
- Configurar alertas de erro e latencia.
- Revisar Cloud SQL para usar IP privado ou conexao gerenciada sem expor rede publica.
- Rotacionar qualquer segredo que tenha sido colado localmente.
