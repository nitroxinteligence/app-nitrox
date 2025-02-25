import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts"

const data = [
  { date: "1 jul", custo: 1.5, cpcMedio: 0.5 },
  { date: "10 jul", custo: 2, cpcMedio: 0.6 },
  { date: "19 jul", custo: 1.8, cpcMedio: 0.55 },
  { date: "28 jul", custo: 2.2, cpcMedio: 0.7 },
  { date: "6 ago", custo: 2.1, cpcMedio: 0.65 },
  { date: "14 ago", custo: 2.3, cpcMedio: 0.75 },
]

export default function CostPerClick() {
  return (
    <Card className="bg-[#0F0F10] border-[#1B1B1D]">
      <CardHeader>
        <CardTitle className="text-white/90 text-lg">Custo por Clique</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke="#333" />
              <XAxis dataKey="date" stroke="#666" />
              <YAxis yAxisId="left" stroke="#666" />
              <YAxis yAxisId="right" orientation="right" stroke="#666" />
              <Tooltip
                contentStyle={{ backgroundColor: "#2A2A2C", border: "1px solid #444" }}
                itemStyle={{ color: "#fff" }}
              />
              <Line yAxisId="left" type="monotone" dataKey="custo" stroke="#58E877" strokeWidth={2} />
              <Line yAxisId="right" type="monotone" dataKey="cpcMedio" stroke="#4CFFA7" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}

