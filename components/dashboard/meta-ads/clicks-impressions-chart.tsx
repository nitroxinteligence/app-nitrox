import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts"

const data = [
  { date: "Nov 17", clicks: 175, impressions: 6357 },
  { date: "Nov 19", clicks: 160, impressions: 6100 },
  { date: "Nov 21", clicks: 190, impressions: 7200 },
  { date: "Nov 23", clicks: 140, impressions: 5800 },
  { date: "Nov 25", clicks: 180, impressions: 6800 },
  { date: "Nov 27", clicks: 150, impressions: 5900 },
  { date: "Nov 29", clicks: 170, impressions: 6400 },
  { date: "Dec 1", clicks: 165, impressions: 6200 },
  { date: "Dec 3", clicks: 185, impressions: 7000 },
  { date: "Dec 5", clicks: 155, impressions: 6000 },
  { date: "Dec 7", clicks: 175, impressions: 6500 },
  { date: "Dec 9", clicks: 160, impressions: 6100 },
  { date: "Dec 11", clicks: 180, impressions: 6700 },
  { date: "Dec 13", clicks: 170, impressions: 6300 },
  { date: "Dec 15", clicks: 175, impressions: 6357 },
]

export default function ClicksImpressionsChart() {
  return (
    <Card className="bg-[#0F0F10] border-[#1B1B1D]">
      <CardHeader>
        <CardTitle className="text-white/90 text-lg">Cliques & Impressões</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
              <XAxis dataKey="date" stroke="#666" tick={{ fill: "#666", fontSize: 14 }} tickLine={{ stroke: "#666" }} />
              <YAxis yAxisId="left" stroke="#666" tick={{ fill: "#666", fontSize: 14 }} tickLine={{ stroke: "#666" }} />
              <YAxis
                yAxisId="right"
                orientation="right"
                stroke="#666"
                tick={{ fill: "#666", fontSize: 14 }}
                tickLine={{ stroke: "#666" }}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#1a1a1c",
                  border: "1px solid rgba(255,255,255,0.1)",
                  borderRadius: "8px",
                  fontSize: "14px",
                }}
                itemStyle={{ color: "#fff" }}
                labelStyle={{ color: "#fff" }}
              />
              <Line
                yAxisId="left"
                type="monotone"
                dataKey="clicks"
                stroke="#58E877"
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4, fill: "#58E877" }}
              />
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="impressions"
                stroke="#4CFFA7"
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4, fill: "#4CFFA7" }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}

