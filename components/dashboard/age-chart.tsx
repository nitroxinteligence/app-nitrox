import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts"

interface AgeChartProps {
  data: Array<{
    name: string
    value: number
  }>
}

const COLORS = ["#58E877", "#4EDB82", "#44CE7D", "#3AC178", "#30B473"]

export default function AgeChart({ data }: AgeChartProps) {
  return (
    <Card className="bg-[#0F0F10] border-[#1B1B1D]">
      <CardHeader>
        <CardTitle className="text-lg text-white">Distribuição por Idade</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={80}
                fill="#58E877"
                paddingAngle={5}
                dataKey="value"
                label={({ name, percent, cx, cy, midAngle, outerRadius }) => {
                  const RADIAN = Math.PI / 180
                  const radius = outerRadius + 10
                  const x = cx + radius * Math.cos(-midAngle * RADIAN)
                  const y = cy + radius * Math.sin(-midAngle * RADIAN)
                  return (
                    <text x={x} y={y} fill="#FFFFFF" textAnchor={x > cx ? "start" : "end"} dominantBaseline="central">
                      {`${name} (${(percent * 100).toFixed(0)}%)`}
                    </text>
                  )
                }}
                labelLine={false}
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  backgroundColor: "#1a1a1c",
                  border: "1px solid rgba(255,255,255,0.1)",
                  borderRadius: "8px",
                  color: "#FFFFFF",
                }}
                itemStyle={{ color: "#FFFFFF" }}
                labelStyle={{ color: "#FFFFFF" }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}

