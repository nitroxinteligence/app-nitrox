export function formatAIMessage(message: string): string {
  // Remove toda formatação markdown exceto negrito e bullets
  let formattedText = message
    // Remove headers markdown
    .replace(/^#{1,6}\s+/gm, '')
    // Remove blocos de código
    .replace(/```[\s\S]*?```/g, '')
    .replace(/`([^`]+)`/g, '$1')
    // Remove itálicos
    .replace(/(?<!\*)\*(?!\*)([^*]+)(?<!\*)\*(?!\*)/g, '$1')
    .replace(/_([^_]+)_/g, '$1')
    // Padroniza bullets para •
    .replace(/^[-*]\s+/gm, '• ')
    // Remove sublinhados
    .replace(/_{2,}/g, '')
    // Remove linhas horizontais
    .replace(/^[-*=]{3,}\s*$/gm, '')
    // Remove espaços extras e linhas em branco múltiplas
    .split('\n')
    .map(line => line.trim())
    .filter(line => line)
    .join('\n');

  // Processa a estrutura do texto
  formattedText = formattedText
    .split('\n')
    .map(line => {
      // Preserva linhas que já estão em negrito
      if (line.match(/^\*\*.*\*\*$/)) {
        return line;
      }

      // Processa numeração
      const numberMatch = line.match(/^(\d+)(?:\.(\d+))?\.\s*(.*)/);
      if (numberMatch) {
        const [, mainNum, subNum, content] = numberMatch;
        // Garante que a frase termine com ponto
        const formattedContent = content.trim().replace(/([^.!?])$/, '$1.');
        if (subNum) {
          return `${mainNum}.${subNum}. ${formattedContent}`;
        }
        return `${mainNum}. ${formattedContent}`;
      }

      // Processa bullets
      if (line.startsWith('•')) {
        // Garante que bullets terminem com ponto
        const content = line.substring(2).trim();
        return `• ${content.replace(/([^.!?])$/, '$1.')}`;
      }

      // Processa títulos e subtítulos (converte para negrito)
      if (line.match(/^[A-Z][\w\s]+:?$/)) {
        return `**${line}**`;
      }

      // Garante que frases normais terminem com ponto
      return line.replace(/([^.!?])$/, '$1.');
    })
    .join('\n');

  // Estrutura o espaçamento
  formattedText = formattedText
    .split('\n')
    .reduce((acc, line, index, array) => {
      // Adiciona espaço duplo após títulos em negrito
      if (line.match(/^\*\*.*\*\*$/)) {
        return acc + line + '\n\n';
      }

      // Agrupa bullets juntos
      if (line.startsWith('•')) {
        const nextLine = array[index + 1];
        return acc + line + (nextLine?.startsWith('•') ? '\n' : '\n\n');
      }

      // Agrupa itens numerados juntos
      if (line.match(/^\d+\./)) {
        const nextLine = array[index + 1];
        return acc + line + (nextLine?.match(/^\d+\./) ? '\n' : '\n\n');
      }

      // Adiciona divisor antes de nova seção
      if (index > 0 && line.match(/^[A-Z][\w\s]+:$/)) {
        return acc + '\n---\n\n' + line + '\n';
      }

      // Espaçamento padrão para outras linhas
      return acc + line + '\n';
    }, '');

  return formattedText.trim();
}

