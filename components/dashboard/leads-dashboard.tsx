"use client"

import { useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Download, FileText, FileSpreadsheet, Filter } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import LeadsChart from "@/components/dashboard/leads-chart"
import ConversionChart from "@/components/dashboard/conversion-chart"
import FunnelChart from "@/components/dashboard/funnel-chart"
import AgeChart from "@/components/dashboard/age-chart"
import { DateRangePicker } from "@/components/date-range-picker"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"

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

export function LeadsDashboard() {
  const [dateRange, setDateRange] = useState<{ from: Date | null; to: Date | null }>({
    from: null,
    to: null,
  })
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false)

  const formatDateRange = () => {
    if (dateRange.from && dateRange.to) {
      return `${format(dateRange.from, "d 'de' MMM", { locale: ptBR })} - ${format(dateRange.to, "d 'de' MMM", { locale: ptBR })}`
    }
    return "Período: últimos 30 dias"
  }

  const handleDateRangeChange = (newRange: { from: Date | null; to: Date | null }) => {
    setDateRange(newRange)
    console.log("Fetching data for range:", newRange)
  }

  return (
    <Card className="bg-black/40 border-white/[0.05] backdrop-blur-xl">
      <CardContent className="p-6 space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h3 className="text-2xl font-semibold text-white mb-2">Métricas de Leads</h3>
            <p className="text-[#E8F3ED]/60">{formatDateRange()}</p>
          </div>
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              size="icon"
              className="w-10 h-10 rounded-full bg-white/5 border-white/10 hover:bg-white/10"
              onClick={() => setIsDatePickerOpen(true)}
            >
              <Filter className="h-4 w-4 text-white/80" />
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button className="gap-2 bg-[#1E1E1E] text-white hover:bg-[#2A2A2C] rounded-full px-6">
                  <Download className="w-4 h-4" />
                  Exportar Dados
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56 bg-[#2A2A2C] border-white/10">
                <DropdownMenuLabel className="text-white/70">Formato de Exportação</DropdownMenuLabel>
                <DropdownMenuSeparator className="bg-white/10" />
                <DropdownMenuItem className="text-white/70 hover:text-white hover:bg-[#3A3A3C]">
                  <FileText className="mr-2 h-4 w-4" />
                  <span>Exportar como PDF</span>
                </DropdownMenuItem>
                <DropdownMenuItem className="text-white/70 hover:text-white hover:bg-[#3A3A3C]">
                  <FileSpreadsheet className="mr-2 h-4 w-4" />
                  <span>Exportar como CSV</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <LeadsChart data={leadData} />
          <ConversionChart data={conversionData} />
          <FunnelChart data={funnelData} />
          <AgeChart data={ageData} />
        </div>

        <DateRangePicker
          isOpen={isDatePickerOpen}
          onClose={() => setIsDatePickerOpen(false)}
          onDateRangeChange={handleDateRangeChange}
        />
      </CardContent>
    </Card>
  )
}

