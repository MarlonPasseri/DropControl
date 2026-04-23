# Cloud SQL: backup e restore

Instancia principal:

```txt
project-a7ab51c3-7d7a-4f8b-a6b:us-central1:drop-controler-db
```

## Estado atual

Configuracoes confirmadas:

- backup automatico: `enabled`
- retencao de backups: `15` backups
- horario do backup: `00:00 UTC`
- point-in-time recovery: `enabled`
- retencao de transaction logs: `14` dias
- availability type: `REGIONAL`
- deletion protection: `enabled`
- final backup on delete: `enabled`
- final backup retention: `30` dias
- storage auto resize: `enabled`

Backups observados:

```txt
2026-04-22 18:37 UTC  SUCCESSFUL
2026-04-23 00:34 UTC  SUCCESSFUL
```

## O que isso significa

Hoje o banco ja tem:

- backup automatico diario;
- recuperacao ponto no tempo;
- protecao contra exclusao acidental;
- retenção minima razoavel para um ambiente pequeno.

Ou seja, a base de resiliencia ja existe.

## Proximo passo recomendado

Fazer um restore de teste em uma instancia temporaria.

Fluxo sugerido:

1. criar uma instancia temporaria de restore em `us-central1`;
2. restaurar o backup automatico mais recente nela;
3. validar conexao, tabelas e quantidade basica de registros;
4. documentar tempo de restore e custo;
5. remover a instancia temporaria depois do teste.

## Checklist de restore

Comandos de referencia:

```powershell
gcloud sql backups list --instance drop-controler-db --project project-a7ab51c3-7d7a-4f8b-a6b
```

```powershell
gcloud sql backups restore BACKUP_ID `
  --restore-instance=drop-controler-db-restore-test `
  --backup-instance=drop-controler-db `
  --project=project-a7ab51c3-7d7a-4f8b-a6b
```

Depois validar:

```powershell
gcloud sql instances describe drop-controler-db-restore-test --project project-a7ab51c3-7d7a-4f8b-a6b
```

E conectar para conferir:

- banco `dropcontrol`
- tabelas principais:
  - `users`
  - `orders`
  - `products`
  - `invoices`
  - `audit_logs`
  - `security_events`

## Observacao operacional

A instancia atual ainda expõe IP publico com rede autorizada para o seu IP.

Isso nao impede backup/restore, mas o endurecimento recomendado depois e:

- reduzir ou remover acesso por IP publico;
- preferir conexao privada/gerenciada do Google Cloud;
- manter acesso administrativo temporario e restrito.
