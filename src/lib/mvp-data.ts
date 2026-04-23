import type { AppRole } from "@/lib/security/roles";

export type NavigationItem = {
  href: string;
  label: string;
  shortLabel: string;
  accent: string;
  roles?: AppRole[];
};

export type MetricCard = {
  label: string;
  value: string;
  note: string;
  accent: "teal" | "amber" | "blue" | "rose" | "slate";
};

export type ProductRecord = {
  name: string;
  sku: string;
  category: string;
  supplier: string;
  costPrice: string;
  shippingCost: string;
  salePrice: string;
  estimatedMargin: string;
  status: "Testando" | "Ativo" | "Vencedor" | "Pausado" | "Encerrado";
  orders: number;
  image: string;
};

export type SupplierRecord = {
  name: string;
  channel: string;
  region: string;
  avgShippingDays: string;
  reliabilityScore: string;
  issueRate: string;
  products: number;
  openOrders: number;
  notes: string;
};

export type OrderRecord = {
  orderNumber: string;
  customerName: string;
  product: string;
  supplier: string;
  purchaseDate: string;
  saleAmount: string;
  totalCost: string;
  status:
    | "Pago"
    | "Aguardando compra"
    | "Comprado"
    | "Enviado"
    | "Entregue"
    | "Atraso"
    | "Problema"
    | "Reembolsado"
    | "Cancelado";
  trackingCode: string;
  eta: string;
};

export type TaskRecord = {
  title: string;
  description: string;
  priority: "Alta" | "Media" | "Baixa";
  status: "Pendente" | "Em andamento" | "Concluida";
  dueDate: string;
  owner: string;
  relation: string;
};

export type FinanceEntryRecord = {
  type: "Receita" | "Despesa" | "Reembolso";
  category: string;
  amount: string;
  referenceDate: string;
  description: string;
};

export const navigationItems: NavigationItem[] = [
  { href: "/dashboard", label: "Dashboard", shortLabel: "Dash", accent: "bg-teal-500" },
  { href: "/integrations", label: "Integracoes", shortLabel: "Apps", accent: "bg-fuchsia-500" },
  { href: "/products", label: "Produtos", shortLabel: "Prod", accent: "bg-blue-500" },
  { href: "/suppliers", label: "Fornecedores", shortLabel: "Forn", accent: "bg-amber-500" },
  { href: "/orders", label: "Pedidos", shortLabel: "Peds", accent: "bg-rose-500" },
  { href: "/invoices", label: "Notas fiscais", shortLabel: "NF", accent: "bg-cyan-500" },
  { href: "/finance", label: "Financeiro", shortLabel: "Fin", accent: "bg-emerald-500" },
  { href: "/tasks", label: "Tarefas", shortLabel: "Task", accent: "bg-orange-500" },
  {
    href: "/security",
    label: "Seguranca",
    shortLabel: "Seg",
    accent: "bg-red-500",
    roles: ["ADMIN"],
  },
  { href: "/profile", label: "Perfil", shortLabel: "Perfil", accent: "bg-slate-500" },
];

export function getNavigationItemsForRole(role: AppRole) {
  return navigationItems.filter((item) => !item.roles || item.roles.includes(role));
}

export const dashboardMetrics: MetricCard[] = [
  {
    label: "Faturamento do dia",
    value: "R$ 3.840",
    note: "+12% vs. ontem",
    accent: "teal",
  },
  {
    label: "Faturamento do mes",
    value: "R$ 64.520",
    note: "Meta: R$ 80.000",
    accent: "blue",
  },
  {
    label: "Lucro estimado",
    value: "R$ 16.930",
    note: "Margem media de 26,2%",
    accent: "amber",
  },
  {
    label: "Pedidos com problema",
    value: "07",
    note: "3 exigem contato hoje",
    accent: "rose",
  },
];

export const dashboardAlerts = [
  "Pedido #BR-2841 sem atualizacao ha 4 dias.",
  "Produto Mini Printer caiu para margem estimada de R$ 18.",
  "Fornecedor Han River Tech passou de 11% de pedidos com problema.",
  "Tarefa 'Revisar anuncios do SKU AIR-LUX' vence hoje as 17h.",
];

export const salesTrend = [
  { label: "Seg", value: 48 },
  { label: "Ter", value: 62 },
  { label: "Qua", value: 55 },
  { label: "Qui", value: 74 },
  { label: "Sex", value: 81 },
  { label: "Sab", value: 68 },
  { label: "Dom", value: 59 },
];

export const topProducts: ProductRecord[] = [
  {
    name: "Massage Gun Mini",
    sku: "MSG-210",
    category: "Bem-estar",
    supplier: "Han River Tech",
    costPrice: "R$ 64",
    shippingCost: "R$ 16",
    salePrice: "R$ 179",
    estimatedMargin: "R$ 99",
    status: "Vencedor",
    orders: 128,
    image: "/media/headset.jpg",
  },
  {
    name: "Smart Lamp Air",
    sku: "AIR-LUX",
    category: "Casa",
    supplier: "Nova Orion Supply",
    costPrice: "R$ 52",
    shippingCost: "R$ 11",
    salePrice: "R$ 149",
    estimatedMargin: "R$ 86",
    status: "Ativo",
    orders: 89,
    image: "/media/lamp.jpg",
  },
  {
    name: "Pocket Printer",
    sku: "PKT-PRINT",
    category: "Papelaria",
    supplier: "Sino Trade Hub",
    costPrice: "R$ 71",
    shippingCost: "R$ 18",
    salePrice: "R$ 139",
    estimatedMargin: "R$ 50",
    status: "Testando",
    orders: 36,
    image: "/media/printer.jpg",
  },
];

export const suppliers: SupplierRecord[] = [
  {
    name: "Han River Tech",
    channel: "WhatsApp",
    region: "Shenzhen, China",
    avgShippingDays: "3,8 dias",
    reliabilityScore: "4,7 / 5",
    issueRate: "11%",
    products: 6,
    openOrders: 22,
    notes: "Boa resposta comercial, mas precisa melhorar o acompanhamento de rastreio.",
  },
  {
    name: "Nova Orion Supply",
    channel: "WeChat",
    region: "Guangzhou, China",
    avgShippingDays: "2,9 dias",
    reliabilityScore: "4,9 / 5",
    issueRate: "4%",
    products: 4,
    openOrders: 14,
    notes: "Melhor parceiro para itens leves e embalagem premium.",
  },
  {
    name: "Sino Trade Hub",
    channel: "E-mail",
    region: "Ningbo, China",
    avgShippingDays: "4,5 dias",
    reliabilityScore: "4,2 / 5",
    issueRate: "9%",
    products: 3,
    openOrders: 9,
    notes: "Preco competitivo, mas prazo oscila quando a demanda sobe.",
  },
];

export const orders: OrderRecord[] = [
  {
    orderNumber: "BR-2841",
    customerName: "Ana Borges",
    product: "Massage Gun Mini",
    supplier: "Han River Tech",
    purchaseDate: "14 Abr",
    saleAmount: "R$ 179",
    totalCost: "R$ 80",
    status: "Atraso",
    trackingCode: "LX9942BR",
    eta: "16 Abr",
  },
  {
    orderNumber: "BR-2836",
    customerName: "Lucas Vieira",
    product: "Smart Lamp Air",
    supplier: "Nova Orion Supply",
    purchaseDate: "15 Abr",
    saleAmount: "R$ 149",
    totalCost: "R$ 63",
    status: "Enviado",
    trackingCode: "YT4721CN",
    eta: "22 Abr",
  },
  {
    orderNumber: "BR-2829",
    customerName: "Paula Medeiros",
    product: "Pocket Printer",
    supplier: "Sino Trade Hub",
    purchaseDate: "13 Abr",
    saleAmount: "R$ 139",
    totalCost: "R$ 89",
    status: "Problema",
    trackingCode: "Aguardando",
    eta: "Sem previsao",
  },
  {
    orderNumber: "BR-2824",
    customerName: "Marcos Silva",
    product: "Smart Lamp Air",
    supplier: "Nova Orion Supply",
    purchaseDate: "12 Abr",
    saleAmount: "R$ 149",
    totalCost: "R$ 63",
    status: "Entregue",
    trackingCode: "YT3108CN",
    eta: "17 Abr",
  },
  {
    orderNumber: "BR-2818",
    customerName: "Carla Rocha",
    product: "Massage Gun Mini",
    supplier: "Han River Tech",
    purchaseDate: "11 Abr",
    saleAmount: "R$ 179",
    totalCost: "R$ 80",
    status: "Comprado",
    trackingCode: "Separando",
    eta: "23 Abr",
  },
];

export const tasks: TaskRecord[] = [
  {
    title: "Cobrar atualizacao de rastreio",
    description: "Confirmar situacao do pedido BR-2841 e registrar resposta do fornecedor.",
    priority: "Alta",
    status: "Pendente",
    dueDate: "Hoje, 14:00",
    owner: "Marlon",
    relation: "Pedido BR-2841",
  },
  {
    title: "Revisar margem do Pocket Printer",
    description: "Atualizar custo de frete e decidir se o produto continua em teste.",
    priority: "Alta",
    status: "Em andamento",
    dueDate: "Hoje, 17:00",
    owner: "Marlon",
    relation: "Produto PKT-PRINT",
  },
  {
    title: "Ajustar resposta de pos-venda",
    description: "Criar macro para clientes com atraso acima de 7 dias.",
    priority: "Media",
    status: "Concluida",
    dueDate: "Ontem, 18:00",
    owner: "Julia",
    relation: "Operacao",
  },
  {
    title: "Subir nova campanha do Massage Gun",
    description: "Validar criativos e liberar orcamento diario de R$ 200.",
    priority: "Baixa",
    status: "Pendente",
    dueDate: "18 Abr",
    owner: "Julia",
    relation: "Produto MSG-210",
  },
];

export const financeMetrics: MetricCard[] = [
  {
    label: "Receita total",
    value: "R$ 64.520",
    note: "Ultimos 30 dias",
    accent: "teal",
  },
  {
    label: "Custo total",
    value: "R$ 39.410",
    note: "Produto, frete e taxas",
    accent: "slate",
  },
  {
    label: "Lucro bruto",
    value: "R$ 25.110",
    note: "Antes de marketing",
    accent: "blue",
  },
  {
    label: "Lucro liquido estimado",
    value: "R$ 16.930",
    note: "Apos anuncios e despesas",
    accent: "amber",
  },
];

export const financeEntries: FinanceEntryRecord[] = [
  {
    type: "Receita",
    category: "Pedido",
    amount: "R$ 179",
    referenceDate: "16 Abr",
    description: "Pedido BR-2841",
  },
  {
    type: "Despesa",
    category: "Produto + frete",
    amount: "R$ 80",
    referenceDate: "16 Abr",
    description: "Compra ao fornecedor Han River Tech",
  },
  {
    type: "Despesa",
    category: "Anuncio",
    amount: "R$ 42",
    referenceDate: "16 Abr",
    description: "Campanha Massage Gun - Meta Ads",
  },
  {
    type: "Reembolso",
    category: "Chargeback",
    amount: "R$ 139",
    referenceDate: "14 Abr",
    description: "Pedido BR-2811",
  },
];

export const profitabilityByProduct = [
  { label: "Massage Gun Mini", value: "R$ 9.740", share: 82 },
  { label: "Smart Lamp Air", value: "R$ 4.930", share: 58 },
  { label: "Pocket Printer", value: "R$ 1.120", share: 22 },
];

export const profitabilityBySupplier = [
  { label: "Nova Orion Supply", value: "R$ 8.210", share: 78 },
  { label: "Han River Tech", value: "R$ 6.420", share: 61 },
  { label: "Sino Trade Hub", value: "R$ 2.300", share: 29 },
];

export const orderStatusFilters = [
  "Todos",
  "Pago",
  "Aguardando compra",
  "Comprado",
  "Enviado",
  "Atraso",
  "Problema",
];

export const productStatusFilters = [
  "Todos",
  "Testando",
  "Ativo",
  "Vencedor",
  "Pausado",
  "Encerrado",
];

export const taskStatusColumns: TaskRecord["status"][] = [
  "Pendente",
  "Em andamento",
  "Concluida",
];
