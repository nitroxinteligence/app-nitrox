export interface SearchResult {
  title: string
  description: string
  url: string
  category: string
  subcategory?: string
}

const mockData: SearchResult[] = [
  // Início
  {
    title: "Visão Geral",
    description: "Página inicial com visão geral do sistema",
    url: "/",
    category: "Navegação Principal",
  },

  // Chats Inteligentes
  {
    title: "Chats Inteligentes",
    description: "Lista de todos os chats inteligentes disponíveis",
    url: "/chats",
    category: "Chats Inteligentes",
  },
  {
    title: "Colaborador IA SDR",
    description: "Chat inteligente para vendas e qualificação de leads",
    url: "/chat/sdr",
    category: "Chats Inteligentes",
    subcategory: "Vendas",
  },
  {
    title: "Colaborador IA Suporte",
    description: "Chat inteligente para suporte técnico",
    url: "/chat/suporte",
    category: "Chats Inteligentes",
    subcategory: "Suporte",
  },
  {
    title: "Colaborador IA Atendimento",
    description: "Chat inteligente para atendimento ao cliente",
    url: "/chat/atendimento",
    category: "Chats Inteligentes",
    subcategory: "Atendimento",
  },

  // Métricas
  {
    title: "Métricas",
    description: "Visão geral de todas as métricas",
    url: "/metricas",
    category: "Métricas",
  },
  {
    title: "Métricas de Leads",
    description: "Acompanhe a performance dos seus leads",
    url: "/metricas/leads",
    category: "Métricas",
  },
  {
    title: "Métricas de Vendas",
    description: "Acompanhe a performance das suas vendas",
    url: "/metricas/vendas",
    category: "Métricas",
  },
  {
    title: "Métricas de Marketing",
    description: "Acompanhe a performance das suas campanhas",
    url: "/metricas/marketing",
    category: "Métricas",
  },

  // CRM
  {
    title: "CRM",
    description: "Sistema de Gestão de Relacionamento com o Cliente",
    url: "/crm",
    category: "CRM",
  },
  {
    title: "Contatos",
    description: "Lista de todos os contatos no CRM",
    url: "/crm/contatos",
    category: "CRM",
    subcategory: "Contatos",
  },
  {
    title: "Oportunidades",
    description: "Lista de oportunidades de negócio",
    url: "/crm/oportunidades",
    category: "CRM",
    subcategory: "Oportunidades",
  },

  // Integrações
  {
    title: "Integrações",
    description: "Gerenciamento de integrações com outras plataformas",
    url: "/integracoes",
    category: "Integrações",
  },
  {
    title: "Integração com WhatsApp",
    description: "Configurar integração com WhatsApp Business API",
    url: "/integracoes/whatsapp",
    category: "Integrações",
    subcategory: "WhatsApp",
  },
  {
    title: "Integração com Salesforce",
    description: "Configurar integração com Salesforce CRM",
    url: "/integracoes/salesforce",
    category: "Integrações",
    subcategory: "Salesforce",
  },

  // Perfil e Configurações
  {
    title: "Perfil",
    description: "Gerenciar informações do perfil e configurações da conta",
    url: "/perfil",
    category: "Configurações",
  },
  {
    title: "Informações Pessoais",
    description: "Editar informações pessoais do usuário",
    url: "/perfil/informacoes",
    category: "Configurações",
    subcategory: "Perfil",
  },
  {
    title: "Segurança",
    description: "Configurações de segurança da conta",
    url: "/perfil/seguranca",
    category: "Configurações",
    subcategory: "Segurança",
  },
  {
    title: "Notificações",
    description: "Gerenciar preferências de notificações",
    url: "/perfil/notificacoes",
    category: "Configurações",
    subcategory: "Notificações",
  },
  {
    title: "Faturamento",
    description: "Informações de faturamento e assinatura",
    url: "/perfil/faturamento",
    category: "Configurações",
    subcategory: "Faturamento",
  },

  // Setores
  {
    title: "Setores",
    description: "Informações específicas para diferentes setores",
    url: "/setores",
    category: "Setores",
  },
  {
    title: "Setor de Saúde",
    description: "Soluções e informações para o setor de saúde",
    url: "/setores/saude",
    category: "Setores",
    subcategory: "Saúde",
  },
  {
    title: "Setor Financeiro",
    description: "Soluções e informações para o setor financeiro",
    url: "/setores/financeiro",
    category: "Setores",
    subcategory: "Financeiro",
  },
  {
    title: "Setor de Educação",
    description: "Soluções e informações para o setor de educação",
    url: "/setores/educacao",
    category: "Setores",
    subcategory: "Educação",
  },
]

export async function searchData(query: string): Promise<SearchResult[]> {
  // Simulate API delay
  await new Promise((resolve) => setTimeout(resolve, 300))

  return mockData.filter(
    (item) =>
      item.title.toLowerCase().includes(query.toLowerCase()) ||
      item.description.toLowerCase().includes(query.toLowerCase()) ||
      item.category.toLowerCase().includes(query.toLowerCase()) ||
      (item.subcategory && item.subcategory.toLowerCase().includes(query.toLowerCase())),
  )
}

