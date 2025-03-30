"use client"

import React, { useEffect, useState, useRef } from "react"
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { cn } from "@/lib/utils"

interface TypingEffectProps {
  content: string
  speed?: number
  className?: string
  markdownComponents?: any
  onComplete?: () => void
  isComplete?: boolean
}

export function TypingEffect({ 
  content,
  speed = 10, // Caracteres por frame
  className,
  markdownComponents,
  onComplete,
  isComplete = false
}: TypingEffectProps) {
  const [displayedContent, setDisplayedContent] = useState("")
  const [isTyping, setIsTyping] = useState(true)
  const contentRef = useRef(content)
  const positionRef = useRef(0)
  const rafRef = useRef<number | null>(null)
  
  // Resetar o componente se o conteúdo mudar
  useEffect(() => {
    if (content !== contentRef.current) {
      contentRef.current = content
      positionRef.current = 0
      setDisplayedContent("")
      setIsTyping(true)
    }
  }, [content])
  
  // Forçar a conclusão se isComplete for true
  useEffect(() => {
    if (isComplete && isTyping) {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current)
        rafRef.current = null
      }
      setDisplayedContent(content)
      setIsTyping(false)
      onComplete?.()
    }
  }, [isComplete, content, isTyping, onComplete])
  
  // Efeito de digitação
  useEffect(() => {
    if (!isTyping || isComplete) return
    
    const typeNextChunk = () => {
      if (positionRef.current < contentRef.current.length) {
        const nextPosition = Math.min(
          positionRef.current + speed, 
          contentRef.current.length
        )
        const nextChunk = contentRef.current.substring(0, nextPosition)
        setDisplayedContent(nextChunk)
        positionRef.current = nextPosition
        
        rafRef.current = requestAnimationFrame(typeNextChunk)
      } else {
        setIsTyping(false)
        onComplete?.()
      }
    }
    
    rafRef.current = requestAnimationFrame(typeNextChunk)
    
    return () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current)
        rafRef.current = null
      }
    }
  }, [isTyping, speed, isComplete, onComplete])
  
  // Renderizar markdown se componentes de markdown forem fornecidos
  if (markdownComponents) {
    return (
      <div className={cn("prose prose-invert max-w-none", className)}>
        <ReactMarkdown 
          components={markdownComponents} 
          remarkPlugins={[remarkGfm]}
        >
          {displayedContent}
        </ReactMarkdown>
      </div>
    )
  }
  
  // Renderizar texto simples com quebras de linha preservadas
  return (
    <div className={className}>
      {displayedContent.split("\n").map((line, i) => (
        <React.Fragment key={i}>
          {line}
          {i < displayedContent.split("\n").length - 1 && <br />}
        </React.Fragment>
      ))}
    </div>
  )
} 