# Monitoramento e alertas

Recursos configurados no projeto Google Cloud `dropcontrol-494022`.

## Canal de notificacao

Email:

```txt
marlonn.contato@gmail.com
```

Canal:

```txt
projects/dropcontrol-494022/notificationChannels/1284297119178670893
```

## Alertas Cloud Monitoring

Politicas ativas:

```txt
DropControl - Cloud Run 5xx errors
DropControl - Cloud Run high latency p95
DropControl - Migration job failed
DropControl - Cloud Run ERROR logs
```

Regras:

- `Cloud Run 5xx errors`: alerta se `dropship-control` retornar qualquer resposta `5xx` em 5 minutos.
- `Cloud Run high latency p95`: alerta se o p95 de latencia passar de `3000ms` por 5 minutos.
- `Migration job failed`: alerta se `dropship-control-migrate` terminar com resultado diferente de `succeeded`.
- `Cloud Run ERROR logs`: alerta se o servico gerar logs com severidade `ERROR` ou superior.

## Log-based metric

Metrica:

```txt
dropcontrol_app_error_logs
```

Filtro:

```txt
resource.type="cloud_run_revision"
resource.labels.service_name="dropship-control"
severity>=ERROR
```

## Budget

Billing account:

```txt
0130C3-29DE5E-A0CAA8
```

Budget:

```txt
DropControl mensal
100 BRL
```

Escopo:

```txt
projects/dropcontrol-494022
```

Thresholds:

```txt
50%
90%
100%
120% forecasted
```

## Verificacao rapida

```powershell
gcloud monitoring policies list --project dropcontrol-494022
gcloud logging metrics list --project dropcontrol-494022
gcloud billing budgets list --billing-account 0130C3-29DE5E-A0CAA8
```
