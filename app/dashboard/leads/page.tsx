"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  Pie,
  PieChart,
} from "recharts"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  ArrowUpRight,
  Download,
  FileText,
  FileSpreadsheet,
  Filter,
  Users,
  Target,
  UserCheck,
  TrendingUp,
} from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import StatCard from "@/components/dashboard/stat-card"
import LeadsChart from "@/components/dashboard/leads-chart"
import ConversionChart from "@/components/dashboard/conversion-chart"
import FunnelChart from "@/components/dashboard/funnel-chart"
import AgeChart from "@/components/dashboard/age-chart"
import { DateRangePicker } from "@/components/date-range-picker"

// Sample data
const leadData = [
  { month: "Jan", leads: 1500 },
  { month: "Feb", leads: 1800 },
  { month: "Mar", leads: 2500 },
  { month: "Apr", leads: 1200 },
  { month: "May", leads: 2000 },
  { month: "Jun", leads: 2300 },
]

const funnelData = [
  { stage: "Leads Frios", value: 500 },
  { stage: "Leads Mornos", value: 300 },
  { stage: "Leads Quentes", value: 150 },
  { stage: "Oportunidades", value: 75 },
  { stage: "Clientes", value: 30 },
]

const conversionData = [
  { name: "Frio para Morno", taxa: 60 },
  { name: "Morno para Quente", taxa: 50 },
  { name: "Quente para Oportunidade", taxa: 40 },
  { name: "Oportunidade para Cliente", taxa: 30 },
]

const ageData = [
  { name: "18-25", value: 40 },
  { name: "26-35", value: 30 },
  { name: "36-45", value: 15 },
  { name: "46-55", value: 10 },
  { name: "+55", value: 5 },
]

export default function LeadsDashboardPage() {
  const [dateRange, setDateRange] = useState<{ from: Date | null; to: Date | null }>({
    from: null,
    to: null,
  })
  const [isDateRangePickerOpen, setIsDateRangePickerOpen] = useState(false)

  const handleDateRangeChange = (range: { from: Date | null; to: Date | null }) => {
    setDateRange(range)
    console.log("Selected date range:", range)
  }

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-semibold text-white">Leads Dashboard</h2>
        <p className="text-[#E8F3ED]/60 mt-1">Visão geral dos seus leads e métricas de conversão.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <LeadsChart data={leadData} />
        <ConversionChart data={conversionData} />
        <FunnelChart data={funnelData} />
        <AgeChart data={ageData} />
      </div>
      <DateRangePicker
        isOpen={isDateRangePickerOpen}
        onClose={() => setIsDateRangePickerOpen(false)}
        onDateRangeChange={handleDateRangeChange}
      />
      <Button
        variant="outline"
        size="icon"
        className="w-10 h-10 rounded-full bg-white/5 border-white/10 hover:bg-white/10"
        onClick={() => setIsDateRangePickerOpen(true)}
      >
        <Filter className="h-4 w-4 text-white/80" />
      </Button>
    </div>
  )
}

