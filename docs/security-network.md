# Seguranca de rede

Este projeto agora inclui uma configuracao de producao em Docker Compose com segregacao basica de rede e controles de borda.

## Arquitetura

- `edge`: Nginx exposto na porta publica. Recebe trafego externo, aplica limites de requisicao e registra logs.
- `app`: Next.js em rede interna. Nao publica porta no host.
- `postgres`: banco em rede interna separada. Nao publica porta no host.

A rede `db_net` e marcada como `internal`, entao o banco nao aceita acesso direto de fora do Docker. A aplicacao nao publica porta no host e so e acessada pelo proxy `edge` na rede `app_net`; ela ainda mantem saida para internet para OAuth e integracoes externas.

## Executar

```bash
docker compose -f compose.security.yaml up -d --build
```

O servico `migrate` roda `prisma migrate deploy` dentro da rede privada antes da aplicacao iniciar.

Ver logs de borda:

```bash
docker compose -f compose.security.yaml logs -f edge
```

Os logs do Nginx tambem ficam no volume `edge_logs`, em `/var/log/nginx/access.log` e `/var/log/nginx/error.log` dentro do container.

Ver logs do banco:

```bash
docker compose -f compose.security.yaml logs -f postgres
```

## Controles implementados

- banco sem porta exposta para o host;
- migrations executadas dentro da rede privada do banco;
- rede publica separada da rede da aplicacao;
- rede do banco separada da rede da aplicacao;
- Nginx como reverse proxy na borda;
- limite de corpo em `6m`, alinhado ao limite das Server Actions;
- rate limit geral, rate limit para API e rate limit especifico para login/Auth;
- limite de conexoes por IP;
- logs de acesso com tempo de resposta, request id e metadados do upstream;
- bloqueio de dotfiles e metodos HTTP inesperados na borda;
- headers de seguranca e politica CSP com endpoint de reporte em `/api/security/csp-report`;
- `/.well-known/security.txt` para contato de seguranca;
- trilha de auditoria persistente em `audit_logs`;
- eventos de seguranca persistentes em `security_events`;
- tela protegida `/security` para acompanhar auditoria, login e sinais de seguranca da conta;
- rotacao de logs dos containers;
- containers com `no-new-privileges`;
- Nginx em filesystem somente leitura, com `tmpfs` para diretorios temporarios.

## O que ainda deve ficar na infraestrutura

Este Compose melhora o baseline, mas nao substitui controles de cloud ou datacenter:

- TLS real com renovacao de certificado;
- firewall/security groups permitindo entrada apenas para 80/443;
- WAF gerenciado, por exemplo Cloudflare, AWS WAF ou equivalente;
- IDS/IPS, como Suricata, CrowdSec ou solucao do provedor;
- envio dos logs do Nginx e da aplicacao para SIEM/observabilidade;
- alertas para picos de 401/403/429/5xx, volume anormal por IP e falhas de login;
- backups criptografados e testados do Postgres;
- secrets em cofre, nao em arquivo `.env` no servidor.

## Resposta de compliance sugerida

O app possui uma configuracao de deploy com segregacao de rede via Docker: proxy publico, aplicacao em rede interna e banco em rede privada sem porta exposta. Tambem aplica controles de borda com Nginx, incluindo rate limiting, limite de conexoes, limite de payload e logs de acesso. A aplicacao registra auditoria persistente de acoes sensiveis e eventos de seguranca consultaveis em `/security`. WAF/IDS/IPS, SIEM e alertas centralizados devem ser operados na infraestrutura de hospedagem.
