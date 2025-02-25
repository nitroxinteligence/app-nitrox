import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from "@/components/ui/dropdown-menu"
import { ChevronDown } from "lucide-react"
import { ChartSkeleton } from "@/components/ui/skeleton"

interface FunnelChartProps {
  data: Array<{
    stage: string
    value: number
  }>
}

export default function FunnelChart({ data }: FunnelChartProps) {
  if (!data || data.length === 0) {
    return (
      <Card className="w-full bg-[#0F0F10] border-[#272727]">
        <CardHeader className="flex items-center gap-2 space-y-0 border-b border-[#272727] py-5">
          <div className="grid flex-1 gap-1">
            <CardTitle className="text-white">Funil de Conversão</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6">
          <ChartSkeleton />
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="bg-[#0F0F10] border-[#1B1B1D]">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-white/90 text-lg">Funil de Vendas</CardTitle>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              className="bg-[#1a1a1c] text-white/70 rounded-full px-4 py-2 text-sm border border-white/10 hover:bg-[#2a2a2c] hover:text-white transition-colors duration-200"
            >
              Últimos 6 meses
              <ChevronDown className="ml-2 h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="bg-[#1a1a1c] border border-white/10">
            <DropdownMenuItem className="text-white/70 hover:text-white hover:bg-[#2a2a2c]">
              Últimos 6 meses
            </DropdownMenuItem>
            <DropdownMenuItem className="text-white/70 hover:text-white hover:bg-[#2a2a2c]">
              Últimos 12 meses
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </CardHeader>
      <CardContent>
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} layout="vertical" margin={{ top: 0, right: 0, left: 40, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" horizontal={true} vertical={false} />
              <XAxis type="number" stroke="rgba(255,255,255,0.5)" fontSize={12} tickLine={false} axisLine={false} />
              <YAxis
                type="category"
                dataKey="stage"
                stroke="rgba(255,255,255,0.5)"
                fontSize={12}
                tickLine={false}
                axisLine={false}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#1a1a1c",
                  border: "1px solid rgba(255,255,255,0.1)",
                  borderRadius: "8px",
                }}
                itemStyle={{ color: "#58E877" }}
                labelStyle={{ color: "white" }}
              />
              <Bar dataKey="value" fill="#58E877" radius={[0, 4, 4, 0]} maxBarSize={30} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}

