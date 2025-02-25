import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ArrowUpRight, ArrowDownRight } from "lucide-react"

interface Stat {
  label: string
  value: string
  change: number
  previousValue?: string
}

interface StatCardProps {
  title: string
  stats: Stat[]
}

export default function StatCard({ title, stats }: StatCardProps) {
  return (
    <Card className="bg-[#0F0F10] border-white/[0.05] backdrop-blur-xl">
      <CardHeader>
        <CardTitle className="text-white text-lg">{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {stats.map((stat, index) => (
          <div key={index} className="flex justify-between items-center">
            <div>
              <p className="text-sm text-white/60">{stat.label}</p>
              <p className="text-xl font-bold text-white">R${stat.value}</p>
              {stat.previousValue && (
                <p className="text-xs text-white/40">vs período anterior (R${stat.previousValue})</p>
              )}
            </div>
            <div className={`flex items-center ${stat.change >= 0 ? "text-[#58E877]" : "text-red-400"}`}>
              {stat.change >= 0 ? (
                <ArrowUpRight className="w-4 h-4 mr-1" />
              ) : (
                <ArrowDownRight className="w-4 h-4 mr-1" />
              )}
              <span className="text-sm">{Math.abs(stat.change)}%</span>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}

