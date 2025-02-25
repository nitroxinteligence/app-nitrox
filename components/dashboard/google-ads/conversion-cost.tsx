import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts"

const data = [
  { date: "1 jul", conversions: 200, taxaConv: 8 },
  { date: "10 jul", conversions: 250, taxaConv: 10 },
  { date: "19 jul", conversions: 180, taxaConv: 7 },
  { date: "28 jul", conversions: 300, taxaConv: 12 },
  { date: "6 ago", conversions: 280, taxaConv: 11 },
  { date: "14 ago", conversions: 320, taxaConv: 13 },
]

export default function ConversionCost() {
  return (
    <Card className="bg-[#0F0F10] border-[#1B1B1D]">
      <CardHeader>
        <CardTitle className="text-white/90 text-lg">Conversões & Taxa de Conversão</CardTitle>
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
              <Line yAxisId="left" type="monotone" dataKey="conversions" stroke="#58E877" strokeWidth={2} />
              <Line yAxisId="right" type="monotone" dataKey="taxaConv" stroke="#4CFFA7" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}

