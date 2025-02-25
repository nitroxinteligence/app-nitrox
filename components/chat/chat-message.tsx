"use client"

import { cn } from "@/lib/utils"
import { Message } from "@/lib/types"
import { formatAIMessage } from "@/lib/format-message"

export function ChatMessage({ message }: { message: Message }) {
  const formattedContent = message.role === 'assistant' 
    ? formatAIMessage(message.content)
    : message.content;

  return (
    <div className={cn(
      "flex w-full items-start gap-4 p-6",
      message.role === "assistant" ? "bg-[#0F0F10]" : "bg-background"
    )}>
      <div className="flex-1 text-base leading-relaxed">
        {message.role === "assistant" ? (
          <div className="space-y-1">
            {formattedContent.split('\n').map((line: string, i: number) => {
              // Se a linha está vazia, retorna um espaçador
              if (!line.trim()) {
                return <div key={`space-${i}`} className="h-2" />;
              }

              // Processa negrito
              const parts: React.ReactNode[] = [];
              let lastIndex = 0;
              const boldPattern = /\*\*([^*]+)\*\*/g;
              let match: RegExpExecArray | null;

              while ((match = boldPattern.exec(line)) !== null) {
                // Adiciona texto antes do negrito
                if (match.index > lastIndex) {
                  parts.push(
                    <span key={`text-${i}-${lastIndex}`}>
                      {line.substring(lastIndex, match.index)}
                    </span>
                  );
                }
                // Adiciona texto em negrito
                parts.push(
                  <span 
                    key={`bold-${i}-${match.index}`} 
                    className="font-bold text-[#58E877]"
                  >
                    {match[1]}
                  </span>
                );
                lastIndex = match.index + match[0].length;
              }

              // Adiciona o restante do texto
              if (lastIndex < line.length) {
                parts.push(
                  <span key={`text-${i}-${lastIndex}`}>
                    {line.substring(lastIndex)}
                  </span>
                );
              }

              // Retorna a linha formatada
              return (
                <div 
                  key={`line-${i}`} 
                  className={cn(
                    "min-h-[1.5em]",
                    line.startsWith('-') && "pl-4",  // Indenta bullets
                    line.match(/^\d+\./) && "pl-4"   // Indenta números
                  )}
                >
                  {parts.length > 0 ? parts : line}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="whitespace-pre-wrap">{formattedContent}</div>
        )}
      </div>
    </div>
  );
}

