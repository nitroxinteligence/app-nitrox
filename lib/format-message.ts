/**
 * Formata a mensagem da AI para exibição, preservando formatação Markdown essencial
 */
export function formatAIMessage(message: string): string {
  if (!message) return "";

  let formattedMessage = message;

  // Normaliza quebras de linha
  formattedMessage = formattedMessage
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n");

  // Remove headers extras (manter somente os essenciais h1, h2, h3)
  formattedMessage = formattedMessage
    .replace(/^#{4,}.*$/gm, "")
    .replace(/^# /gm, "## "); // Converte H1 para H2 para manter consistência

  // Garante que títulos em negrito sejam formatados corretamente
  formattedMessage = formattedMessage
    .replace(/\*\*([^*\n]+)\*\*:/g, "**$1:**");

  // Corrige listas com marcadores
  formattedMessage = formattedMessage
    .replace(/^\s*[-*+]\s+/gm, "- ") // Normaliza bullets para um formato único
    .replace(/\n\s*[-*+]\s+/gm, "\n- "); // Garante que bullets após quebras de linha são formatados

  // Corrige listas numeradas
  formattedMessage = formattedMessage
    .replace(/^\s*(\d+)[.)]\s+/gm, "$1. ")
    .replace(/\n\s*(\d+)[.)]\s+/gm, "\n$1. ");
    
  // Garante que todas as frases terminam com pontuação
  formattedMessage = formattedMessage
    .replace(/([a-zA-Z0-9])\n/g, "$1.\n") // Adiciona ponto no final de frases que terminam com quebra de linha
    .replace(/([a-zA-Z0-9])$/g, "$1."); // Adiciona ponto no final do texto

  // Estrutura o documento para melhor legibilidade
  formattedMessage = formattedMessage
    .replace(/(\*\*[^*\n]+\*\*:?\.?)\n/g, "$1\n\n") // Garante quebra dupla após títulos em negrito
    .replace(/(\n- [^\n]+)(\n)(?!- )/g, "$1\n$2") // Agrupa itens relacionados juntos
    .replace(/\n{3,}/g, "\n\n"); // Remove múltiplas quebras de linha

  // Garante espaçamento adequado após código, títulos e listas
  formattedMessage = formattedMessage
    .replace(/```[\s\S]*?```\s*/, match => match + "\n\n")
    .replace(/#{1,3}.*\s*/, match => match + "\n");

  // Limpa linhas em branco extras
  formattedMessage = formattedMessage
    .replace(/^\s*[\r\n]/gm, "") // Remove linhas em branco
    .replace(/\n{3,}/g, "\n\n"); // Limita a 2 quebras seguidas
    
  // Tratar caracteres especiais e emojis
  formattedMessage = formattedMessage
    .replace(/&nbsp;/g, " ")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
    
  // Formatação final e limpeza
  return formattedMessage.trim();
}

