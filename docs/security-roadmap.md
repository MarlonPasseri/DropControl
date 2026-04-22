# Roadmap de seguranca para dados de clientes

Esta aplicacao agora tem uma base melhor de seguranca de rede e borda, mas dados de clientes exigem controles operacionais alem do codigo. Use este checklist antes de producao.

## Antes de expor publicamente

- Usar HTTPS com certificado valido e renovacao automatica.
- Colocar WAF na frente do `edge`, por exemplo Cloudflare, AWS WAF ou equivalente.
- Permitir no firewall/security group somente 80/443 publicos.
- Manter Postgres sem porta publica.
- Usar secrets manager para `AUTH_SECRET`, `DATABASE_URL`, tokens OAuth e segredos TikTok.
- Ativar backup automatico criptografado do banco, com teste de restore.
- Enviar logs de Nginx, app e banco para observabilidade centralizada.
- Criar alertas para 401/403/429/5xx, pico de requests por IP, falhas de login e erros de webhook.

## Dados pessoais

- Definir quais campos sao dados pessoais: cliente, email, telefone, endereco, pedidos e notas.
- Minimizar coleta: guardar somente o necessario para operacao.
- Definir retencao e exclusao de dados.
- Criptografar backups e volumes do banco no provedor.
- Avaliar criptografia em nivel de campo para dados mais sensiveis.
- Limitar exportacoes e acesso administrativo.

## Controle de acesso

- Exigir senhas fortes e considerar MFA.
- Separar perfis de acesso quando houver mais de um operador.
- Registrar auditoria de alteracoes em pedidos, clientes, notas e financeiro.
- Revisar sessoes, tempo de expiracao e revogacao de acesso.

## Monitoramento e resposta

- Centralizar CSP reports de `/api/security/csp-report`.
- Revisar logs de borda periodicamente.
- Integrar WAF/IDS/IPS com alertas.
- Documentar processo de resposta a incidente.
- Manter dependencias atualizadas e rodar auditoria de pacotes no CI.

## Implementado no codigo

- Tabelas `audit_logs` e `security_events`.
- Auditoria de criacao, edicao, exclusao, importacao e mudanca de status em dados operacionais.
- Eventos de login bem-sucedido, falha de login, rate limit, cadastro e CSP.
- Tela protegida `/security` para consulta operacional.
- CSP, security headers e endpoint de reporte.
- Deploy Docker com proxy, rede privada para banco e containers com privilegios reduzidos.

## Proximo incremento recomendado no codigo

1. Adicionar papeis/permissoes por usuario.
2. Adicionar MFA.
3. Mover uploads de perfil para storage privado com URLs assinadas.
4. Adicionar testes automatizados para autorizacao e isolamento por usuario.
5. Adicionar alertas automaticos para eventos `WARN`, `ERROR` e `CRITICAL`.
