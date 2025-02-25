import type React from "react"
import { Card, CardContent } from "@/components/ui/card"
import { motion } from "framer-motion"

interface GaugeProps {
  value: number
  maxValue: number
  title: string
  format: (value: number) => string
  color: string
  period?: string
}

const Gauge: React.FC<GaugeProps> = ({ value, maxValue, title, format, color, period }) => {
  const percentage = (value / maxValue) * 100
  const angle = (percentage * 180) / 100

  return (
    <Card className="bg-[#0F0F10] border-white/[0.05] rounded-xl overflow-hidden">
      <CardContent className="p-6">
        {/* Period text */}
        <div className="text-sm text-white/50 mb-4">{period}</div>

        {/* Title and Value */}
        <div className="text-center mb-6">
          <div className="text-base font-medium text-white/70 mb-2">{title}</div>
          <div className="text-3xl font-bold text-white">{format(value)}</div>
        </div>

        {/* Gauge */}
        <div className="relative w-full aspect-[2/1] h-32">
          <svg viewBox="0 0 200 120" className="w-full h-full">
            {/* Background arc */}
            <path
              d="M20 100 A 80 80 0 0 1 180 100"
              fill="none"
              stroke="rgba(255,255,255,0.1)"
              strokeWidth="16"
              strokeLinecap="round"
            />

            {/* Value arc */}
            <motion.path
              d="M20 100 A 80 80 0 0 1 180 100"
              fill="none"
              stroke={`url(#gradient-${title})`}
              strokeWidth="16"
              strokeLinecap="round"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: percentage / 100 }}
              transition={{ duration: 1.5, ease: "easeInOut" }}
            />

            {/* Gradient definition */}
            <defs>
              <linearGradient id={`gradient-${title}`} x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#58E877" />
                <stop offset="100%" stopColor="#E8F3ED" />
              </linearGradient>
            </defs>

            {/* Tick marks and labels */}
            <g className="text-xs fill-white/50">
              <text x="15" y="120" textAnchor="start">
                0
              </text>
              <text x="100" y="120" textAnchor="middle">
                83,33%
              </text>
              <text x="185" y="120" textAnchor="end">
                100%
              </text>
            </g>

            {/* Pointer */}
            <motion.g
              initial={{ rotate: -90 }}
              animate={{ rotate: angle - 90 }}
              style={{ transformOrigin: "100px 100px" }}
              transition={{ type: "spring", stiffness: 60, damping: 12, delay: 0.5 }}
            >
              <line x1="100" y1="100" x2="100" y2="70" stroke="white" strokeWidth="2" strokeLinecap="round" />
              <circle cx="100" cy="100" r="4" fill="white" />
            </motion.g>
          </svg>
        </div>
      </CardContent>
    </Card>
  )
}

const GaugeMetrics: React.FC = () => {
  const period = "Últimos 30 dias (17 nov - 16 dez)"

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
      <Gauge
        value={4.0}
        maxValue={5.0}
        title="CPC"
        format={(value) => `R$ ${value.toFixed(2)}`}
        color="#3699FF"
        period={period}
      />
      <Gauge
        value={1.0}
        maxValue={2.0}
        title="CPM"
        format={(value) => `R$ ${value.toFixed(2)}`}
        color="#0BB783"
        period={period}
      />
      <Gauge value={800} maxValue={1000} title="CTR" format={(value) => `${value}%`} color="#8950FC" period={period} />
    </div>
  )
}

export default GaugeMetrics

