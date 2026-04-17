# Dropship Control - backlog tecnico inicial

## Fase 1 - Fundacao

### Objetivo
Colocar autenticacao, shell principal e base do banco no ar.

### Entregas

- configurar Prisma com PostgreSQL
- criar migrations iniciais
- integrar Auth.js
- proteger rotas privadas
- montar layout principal com sidebar e header
- criar biblioteca de componentes base

## Fase 2 - Cadastros

### Objetivo
Liberar operacao basica de produtos, fornecedores e tarefas.

### Entregas

- CRUD de produtos
- CRUD de fornecedores
- CRUD de tarefas
- filtros por status, prioridade e busca simples
- validacao de formularios com Zod
- seed com dados de exemplo

## Fase 3 - Pedidos

### Objetivo
Dar controle do fluxo operacional ponta a ponta.

### Entregas

- CRUD de pedidos
- atualizacao rapida de status
- vinculo obrigatorio com produto
- vinculo com fornecedor
- filtros por periodo e status
- destaque de atraso e problema no dashboard

## Fase 4 - Financeiro

### Objetivo
Fechar o loop de margem e lucro.

### Entregas

- CRUD de lancamentos financeiros
- recalculo de lucro por pedido
- resumo financeiro mensal
- lucro por produto
- lucro por fornecedor
- visao de reembolsos

## Fase 5 - Alertas e refinamento

### Objetivo
Aumentar confianca operacional e acabamento do produto.

### Entregas

- regras de alerta do MVP
- centro de alertas no dashboard
- pagina de busca e paginacao
- melhoria de responsividade
- empty states, loading states e mensagens de erro

## Historias tecnicas prioritarias

1. Como operador, quero acessar apenas meus dados para manter a operacao isolada.
2. Como operador, quero cadastrar produtos com margem estimada para decidir o que escalar.
3. Como operador, quero acompanhar pedidos em atraso para agir antes do suporte explodir.
4. Como operador, quero medir lucro por produto e fornecedor para proteger margem.
5. Como operador, quero ter tarefas com prazo e prioridade para nao esquecer rotinas.

## Dependencias recomendadas

- `@prisma/client` e `prisma`
- `next-auth` ou `auth.js`
- `zod`
- `react-hook-form`
- `lucide-react`
- `date-fns`

## Definition of done por modulo

- schema e migration aplicados
- validacao de formulario pronta
- listagem com filtros basicos
- create/edit/delete funcionando
- feedback visual de erro e sucesso
- cobertura minima de testes nos fluxos centrais
