import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Formata um valor numérico como moeda (USD)
 */
export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(value)
}

/**
 * Garante a formatação adequada de Markdown em respostas 
 */
export function formatMarkdown(text: string): string {
  if (!text) return "";
  
  return text
    // Normaliza quebras de linha
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    
    // Garante que títulos em negrito têm espaço adequado
    .replace(/(\*\*[^*\n]+\*\*:?\.?)\n/g, "$1\n\n")
    
    // Garante que listas têm formato consistente
    .replace(/^\s*[-*+]\s+/gm, "- ")
    .replace(/\n\s*[-*+]\s+/gm, "\n- ")
    
    // Garante que listas numeradas têm formato consistente
    .replace(/^\s*(\d+)[.)]\s+/gm, "$1. ")
    .replace(/\n\s*(\d+)[.)]\s+/gm, "\n$1. ")
    
    // Limita quebras de linha excessivas
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
