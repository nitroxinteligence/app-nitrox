"use client"

import { useState, useEffect } from "react"
import { Progress } from "@/components/ui/progress"
import { motion } from "framer-motion"

interface LoadingScreenProps {
  duration?: number
  title?: string
  subtitle?: string
  onComplete?: () => void
}

export function LoadingScreen({
  duration = 3000,
  title = "Inicializando...",
  subtitle = "Preparando sua experiência",
  onComplete
}: LoadingScreenProps) {
  const [progress, setProgress] = useState(0)
  
  useEffect(() => {
    // Calcular o intervalo com base na duração
    const interval = duration / 100
    
    // Atualizar a barra de progresso
    const timer = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) {
          clearInterval(timer)
          return 100
        }
        return prev + 1
      })
    }, interval)
    
    // Chamar o callback quando completar
    const completeTimer = setTimeout(() => {
      if (onComplete) onComplete()
    }, duration)
    
    return () => {
      clearInterval(timer)
      clearTimeout(completeTimer)
    }
  }, [duration, onComplete])

  return (
    <motion.div 
      className="fixed inset-0 z-50 bg-[#0A0A0B] flex flex-col items-center justify-center p-6 m-0 w-full h-full overflow-hidden"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
      style={{ margin: 0, padding: 0 }}
    >
      <motion.div 
        className="w-full max-w-md flex flex-col items-center"
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.5 }}
      >
        <motion.h1 
          className="text-2xl font-bold mb-8 text-[#58E877]"
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2, duration: 0.5 }}
        >
          {title}
        </motion.h1>
        
        <Progress 
          value={progress} 
          className="w-full h-2 bg-[#272727]" 
          indicatorClassName="bg-[#58E877]" 
        />
        
        <motion.p 
          className="text-white/60 mt-4 text-sm"
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.3, duration: 0.5 }}
        >
          {subtitle}
        </motion.p>
      </motion.div>
    </motion.div>
  )
} 