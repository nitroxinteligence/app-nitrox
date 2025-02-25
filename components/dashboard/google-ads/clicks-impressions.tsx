import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts"

const data = [
  { date: "1 jul", clicks: 80, ctr: 6 },
  { date: "10 jul", clicks: 100, ctr: 7.5 },
  { date: "19 jul", clicks: 90, ctr: 6.5 },
  { date: "28 jul", clicks: 110, ctr: 8 },
  { date: "6 ago", clicks: 95, ctr: 7 },
  { date: "14 ago", clicks: 105, ctr: 7.8 },
]

export default function ClicksImpressions() {
  return (
    <Card className="bg-[#0F0F10] border-[#1B1B1D]">
      <CardHeader>
        <CardTitle className="text-white/90 text-lg">Cliques & CTR</CardTitle>
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
              <Line yAxisId="left" type="monotone" dataKey="clicks" stroke="#58E877" strokeWidth={2} />
              <Line yAxisId="right" type="monotone" dataKey="ctr" stroke="#4CFFA7" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}

