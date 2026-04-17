# Dropship Control - mapa de navegacao do MVP

## Fluxo principal

1. `Login` -> autenticacao por e-mail e senha
2. `Dashboard` -> leitura geral da operacao e entrada para os modulos
3. `Produtos` -> cadastro, status e margem
4. `Fornecedores` -> qualidade, contato e vinculos
5. `Pedidos` -> acompanhamento operacional e excecoes
6. `Financeiro` -> receita, custo, lucro e reembolsos
7. `Tarefas` -> execucao diaria da operacao

## Estrutura de rotas sugerida

| Rota | Tela | Objetivo | Acoes principais |
| --- | --- | --- | --- |
| `/login` | Login | Autenticar o operador | Entrar, recuperar senha |
| `/dashboard` | Dashboard | Dar visao rapida da operacao | Ver alertas, abrir modulo, priorizar pedidos |
| `/products` | Produtos | Organizar catalogo operado | Criar, editar, filtrar, analisar margem |
| `/suppliers` | Fornecedores | Acompanhar parceiros | Cadastrar, avaliar, relacionar produtos |
| `/orders` | Pedidos | Controlar fluxo do pedido | Criar, atualizar status, rastrear, filtrar |
| `/finance` | Financeiro | Ler resultado da operacao | Ver resumo mensal, lancamentos e lucro |
| `/tasks` | Tarefas | Organizar rotina | Criar, priorizar, concluir, cobrar prazo |

## Navegacao lateral do app

- Dashboard
- Produtos
- Fornecedores
- Pedidos
- Financeiro
- Tarefas

## Fluxos-chave entre modulos

- `Dashboard -> Pedidos`: quando existir atraso, problema ou falta de atualizacao
- `Produtos -> Fornecedores`: revisar parceiro ao detectar queda de margem ou aumento de incidencia
- `Pedidos -> Financeiro`: recalcular lucro por pedido a partir de entradas financeiras
- `Pedidos -> Tarefas`: abrir tratativa para atraso, rastreio ou suporte
- `Financeiro -> Produtos`: identificar produtos com lucro abaixo do minimo

## Regras de destaque no dashboard

- pedidos em atraso
- pedidos com problema
- tarefas vencidas ou do dia
- produtos com margem abaixo do minimo
- fornecedores acima da taxa aceitavel de problema
