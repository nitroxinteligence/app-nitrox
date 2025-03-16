"use client"

import { ReactNode } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { cn } from '@/lib/utils'
import { motion } from 'framer-motion'

interface UsageCardProps {
  title: string
  value: string
  description?: string
  icon?: ReactNode
  progress?: {
    value: number
    max: number
  }
  trend?: {
    value: number
    label: string
  }
  className?: string
  valueClassName?: string
}

export default function UsageCard({
  title,
  value,
  description,
  icon,
  progress,
  trend,
  className,
  valueClassName
}: UsageCardProps) {
  // Determinar a cor da barra de progresso baseada no percentual
  const getProgressColor = (percent: number) => {
    if (percent > 90) return "bg-red-500/70";
    if (percent > 70) return "bg-orange-500/70";
    if (percent > 50) return "bg-gray-400";
    return "bg-[#58E877]";
  };
  
  // Calcular o percentual real para exibição
  const percent = progress 
    ? Math.min(100, Math.max(0, (progress.value / progress.max) * 100))
    : 0;
  
  // Formatar o percentual para exibição
  const percentFormatted = `${Math.round(percent)}%`;
  
  // Determinar se o trend (tendência) é positivo ou negativo
  const isTrendPositive = trend ? trend.value >= 0 : undefined;
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={cn("rounded-lg overflow-hidden", className)}
    >
      <Card className="bg-[#0F0F0F] border border-[#272727] hover:border-[#323234] transition-all duration-200 h-full">
        <CardContent className="p-5 space-y-4">
          <div className="flex justify-between items-start">
            <div>
              <h3 className="text-sm font-medium text-[#adadad] mb-1">{title}</h3>
              <div className="flex items-end space-x-1">
                <div className={cn("text-2xl font-bold text-white", valueClassName)}>{value}</div>
                {trend && (
                  <div 
                    className={cn(
                      "text-xs px-1.5 py-0.5 rounded flex items-center ml-2",
                      isTrendPositive 
                        ? "text-gray-100 bg-gray-700/50" 
                        : "text-gray-100 bg-gray-700/50"
                    )}
                  >
                    <span className="mr-0.5">
                      {isTrendPositive ? "↑" : "↓"}
                    </span>
                    {Math.abs(trend.value).toFixed(1)}%
                  </div>
                )}
              </div>
              {description && (
                <p className="text-xs text-[#878787] mt-1">{description}</p>
              )}
            </div>
            {icon && (
              <div className="bg-[#222224] rounded-lg p-2 text-[#58E877]">
                {icon}
              </div>
            )}
          </div>
          
          {progress && (
            <div className="space-y-1">
              <div className="flex justify-between items-center text-xs">
                <span className="text-[#878787]">Utilizado</span>
                <span className={cn(
                  percent > 90 ? "text-red-400" : 
                  percent > 70 ? "text-gray-300" : 
                  "text-gray-300"
                )}>
                  {percentFormatted}
                </span>
              </div>
              <Progress 
                value={percent} 
                max={100}
                className="h-1.5 bg-[#222224]" 
                indicatorClassName={getProgressColor(percent)}
              />
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  )
} 