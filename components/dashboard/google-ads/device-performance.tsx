import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { PieChart, Pie, Cell, ResponsiveContainer, Legend } from "recharts"
import { motion } from "framer-motion"

// Updated data structure
const data = [
  { name: "Desktop", value: 60, count: "1,348 conversões" },
  { name: "Mobile", value: 30, count: "824 conversões" },
  { name: "Tablet", value: 10, count: "412 conversões" },
]

const COLORS = ["#58E877", "#4EDB82", "#90EEB1"]

export default function DevicePerformance() {
  const totalValue = data.reduce((sum, item) => sum + item.value, 0)

  return (
    <Card className="bg-[#0F0F10] border-[#1B1B1D]">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-white/90 text-lg">Desempenho por Dispositivo</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[300px] flex items-center">
          <div className="w-1/2 space-y-4">
            {data.map((entry, index) => (
              <motion.div
                key={entry.name}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className="flex items-center gap-3"
              >
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[index] }} />
                  <span className="text-white/90 text-sm">{entry.name}</span>
                </div>
                <div className="flex-1 mx-2">
                  <div className="text-xs text-white/60">{entry.count}</div>
                </div>
                <span className="text-white font-medium">{entry.value}%</span>
              </motion.div>
            ))}
          </div>

          <div className="w-1/2 relative">
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={data}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  startAngle={180}
                  endAngle={-180}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {data.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} strokeWidth={0} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-center">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{
                  type: "spring",
                  stiffness: 260,
                  damping: 20,
                  delay: 0.3,
                }}
              >
                <p className="text-xl font-bold text-white">R$ 6.8K</p>
                <p className="text-xs text-white/60">Total de Vendas</p>
              </motion.div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

