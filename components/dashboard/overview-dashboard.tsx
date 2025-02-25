"use client"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { ArrowUpRight, ArrowDownRight, TrendingUp } from "lucide-react"
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts"
import { useState, useEffect } from "react"

const chartData = [
  { name: "Jan", value: 400, leads: 240, conversions: 120 },
  { name: "Fev", value: 300, leads: 139, conversions: 80 },
  { name: "Mar", value: 500, leads: 980, conversions: 240 },
  { name: "Abr", value: 278, leads: 390, conversions: 180 },
  { name: "Mai", value: 789, leads: 480, conversions: 220 },
  { name: "Jun", value: 639, leads: 380, conversions: 210 },
]

interface MetricData {
  name: string
  leads: number
  qualifiedLeads: number
  conversionRate: number
  // Add other metrics here as needed
}

// Fetch data for the performance overview chart. Replace with your actual data fetching logic.
async function getPerformanceMetrics(): Promise<MetricData[]> {
  // Replace this with your actual data fetching logic
  return chartData.map((item) => ({
    name: item.name,
    leads: item.leads,
    qualifiedLeads: item.leads * 0.8, // Example: 80% of leads are qualified
    conversionRate: item.conversions / item.leads, // Example: Conversion rate is conversions / leads
  }))
}

export function OverviewDashboard() {
  const [metricsData, setMetricsData] = useState<MetricData[]>([])

  useEffect(() => {
    const fetchData = async () => {
      const data = await getPerformanceMetrics()
      setMetricsData(data)
    }

    fetchData()
  }, [])

  return (
    <div className="space-y-6">
      {/* Quick Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Leads Gerados" value="1,234" trend={12.3} icon={TrendingUp} />
        <StatCard title="Leads Qualificados" value="856" trend={8.1} icon={TrendingUp} />
        <StatCard title="Leads Convertidos" value="369" trend={15.4} icon={TrendingUp} />
        <StatCard title="Taxa de Conversão" value="43.1%" trend={5.2} icon={TrendingUp} />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="bg-[#121214]/80 border-white/[0.05]">
          <CardHeader>
            <CardTitle className="text-white">Performance Geral</CardTitle>
            <CardDescription className="text-white/60">
              Visão geral das principais métricas da página /dashboard
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={metricsData}>
                  <defs>
                    <linearGradient id="colorGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#58E877" stopOpacity={0.8} />
                      <stop offset="95%" stopColor="#58E877" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                  <XAxis dataKey="name" stroke="#666" />
                  <YAxis stroke="#666" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#1a1a1c",
                      border: "1px solid rgba(255,255,255,0.1)",
                      borderRadius: "8px",
                    }}
                  />
                  {/* Display multiple metrics on the chart */}
                  <Area
                    type="monotone"
                    dataKey="leads"
                    stroke="#58E877"
                    fillOpacity={0.5}
                    fill="url(#colorGradient)"
                    name="Leads"
                  />
                  <Area
                    type="monotone"
                    dataKey="qualifiedLeads"
                    stroke="#4EDB82"
                    fillOpacity={0.5}
                    fill="url(#colorGradient)"
                    name="Leads Qualificados"
                  />
                  <Area
                    type="monotone"
                    dataKey="conversionRate"
                    stroke="#90EEB1"
                    fillOpacity={0.5}
                    fill="url(#colorGradient)"
                    name="Taxa de Conversão"
                  />
                  {/* Add more Area components for other metrics */}
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-[#121214]/80 border-white/[0.05]">
          <CardHeader>
            <CardTitle className="text-white">Leads vs Conversões</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                  <XAxis dataKey="name" stroke="#666" />
                  <YAxis stroke="#666" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#1a1a1c",
                      border: "1px solid rgba(255,255,255,0.1)",
                      borderRadius: "8px",
                    }}
                  />
                  <Bar dataKey="leads" fill="#58E877" />
                  <Bar dataKey="conversions" fill="#4EDB82" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Revenue Analysis */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 bg-[#121214]/80 border-white/[0.05]">
          <CardHeader>
            <CardTitle className="text-white">Análise de Receita</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={[
                    { month: "Jan", recurring: 30000, oneTime: 15000, total: 45000 },
                    { month: "Fev", recurring: 32000, oneTime: 18000, total: 50000 },
                    { month: "Mar", recurring: 35000, oneTime: 20000, total: 55000 },
                    { month: "Abr", recurring: 40000, oneTime: 25000, total: 65000 },
                    { month: "Mai", recurring: 45000, oneTime: 22000, total: 67000 },
                    { month: "Jun", recurring: 48000, oneTime: 28000, total: 76000 },
                  ]}
                  margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
                >
                  <defs>
                    <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#58E877" stopOpacity={0.8} />
                      <stop offset="95%" stopColor="#58E877" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                  <XAxis dataKey="month" stroke="#666" />
                  <YAxis stroke="#666" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#1a1a1c",
                      border: "1px solid rgba(255,255,255,0.1)",
                      borderRadius: "8px",
                    }}
                    formatter={(value) => `R$ ${value.toLocaleString()}`}
                  />
                  <Area
                    type="monotone"
                    dataKey="total"
                    stroke="#58E877"
                    fill="url(#revenueGradient)"
                    strokeWidth={2}
                    name="Receita Total"
                  />
                  <Area
                    type="monotone"
                    dataKey="recurring"
                    stroke="#4EDB82"
                    fill="transparent"
                    strokeWidth={2}
                    name="Receita Recorrente"
                  />
                  <Area
                    type="monotone"
                    dataKey="oneTime"
                    stroke="#90EEB1"
                    fill="transparent"
                    strokeWidth={2}
                    name="Receita Única"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-[#121214]/80 border-white/[0.05]">
          <CardHeader>
            <CardTitle className="text-white">Métricas de Receita</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-[#E8F3ED]/60">MRR</span>
                <span className="text-white font-semibold">R$ 48.000</span>
              </div>
              <div className="w-full bg-[#1a1a1c] rounded-full h-2">
                <div className="bg-[#58E877] h-2 rounded-full" style={{ width: "75%" }} />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-[#E8F3ED]/60">ARR</span>
                <span className="text-white font-semibold">R$ 576.000</span>
              </div>
              <div className="w-full bg-[#1a1a1c] rounded-full h-2">
                <div className="bg-[#58E877] h-2 rounded-full" style={{ width: "85%" }} />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-[#E8F3ED]/60">Churn Rate</span>
                <span className="text-white font-semibold">2.4%</span>
              </div>
              <div className="w-full bg-[#1a1a1c] rounded-full h-2">
                <div className="bg-[#58E877] h-2 rounded-full" style={{ width: "24%" }} />
              </div>
            </div>

            <div className="pt-4 border-t border-[#1a1a1c]">
              <div className="flex justify-between items-center mb-2">
                <span className="text-[#E8F3ED]/60">LTV Médio</span>
                <span className="text-white font-semibold">R$ 4.800</span>
              </div>
              <div className="text-xs text-[#E8F3ED]/40">Aumento de 12% em relação ao mês anterior</div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function StatCard({ title, value, trend, icon: Icon }) {
  const isPositive = trend > 0
  return (
    <Card className="bg-[#121214]/80 border-white/[0.05]">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-white/70">{title}</CardTitle>
        <Icon className="h-4 w-4 text-[#58E877]" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold text-white">{value}</div>
        <div className="flex items-center mt-1">
          {isPositive ? (
            <ArrowUpRight className="w-4 h-4 text-[#58E877]" />
          ) : (
            <ArrowDownRight className="w-4 h-4 text-red-500" />
          )}
          <span className={`text-sm ${isPositive ? "text-[#58E877]" : "text-red-500"}`}>
            {isPositive ? "+" : ""}
            {trend}% desde o último período
          </span>
        </div>
      </CardContent>
    </Card>
  )
}

