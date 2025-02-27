import { OpenAIUsageSummary } from "@/lib/openai-tracker"
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend
} from "recharts"

interface UsageChartProps {
  usageData: OpenAIUsageSummary | null
}

export default function UsageChart({ usageData }: UsageChartProps) {
  // Se não houver dados ou se o array de uso diário estiver vazio, mostrar mensagem
  if (!usageData || !usageData.dailyUsage || usageData.dailyUsage.length === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-white/60">Sem dados suficientes para exibir o gráfico</p>
      </div>
    )
  }

  // Formatar os dados para o gráfico
  const chartData = usageData.dailyUsage.map((day) => ({
    date: day.date,
    custo: day.cost
  }))

  // Personalizar o tooltip do gráfico
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-black/80 border border-white/10 rounded-md shadow-md p-3">
          <p className="font-medium text-white">{label}</p>
          <p className="text-sm text-white/70">
            Custo: <span className="font-medium text-[#58E877]">${payload[0].value.toFixed(4)}</span>
          </p>
          {usageData.dailyUsage.find(day => day.date === label)?.totalTokens && (
            <p className="text-sm text-white/70">
              Tokens: <span className="font-medium text-white">
                {usageData.dailyUsage.find(day => day.date === label)?.totalTokens.toLocaleString()}
              </span>
            </p>
          )}
        </div>
      )
    }
    return null
  }

  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart
        data={chartData}
        margin={{
          top: 10,
          right: 10,
          left: 0,
          bottom: 20
        }}
      >
        <CartesianGrid strokeDasharray="3 3" stroke="#ffffff" opacity={0.05} />
        <XAxis 
          dataKey="date"
          tick={{ fontSize: 12, fill: "#ffffff99" }}
          tickFormatter={(value) => value.slice(0, 5)} // Exibir apenas dia/mês
          stroke="#ffffff20"
        />
        <YAxis
          tick={{ fontSize: 12, fill: "#ffffff99" }}
          tickFormatter={(value) => `$${value.toFixed(2)}`}
          width={60}
          stroke="#ffffff20"
        />
        <Tooltip content={<CustomTooltip />} />
        <Legend 
          wrapperStyle={{ color: "#ffffff99", fontSize: 12 }}
          formatter={(value) => <span className="text-white/70">{value}</span>}
        />
        <Bar
          dataKey="custo"
          name="Custo Diário"
          fill="#58E877"
          radius={[4, 4, 0, 0]}
          animationDuration={1500}
        />
      </BarChart>
    </ResponsiveContainer>
  )
} 