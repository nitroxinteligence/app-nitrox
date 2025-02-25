"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Zap, MessageSquare, TrendingUp, Phone } from "lucide-react"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts"
import { Button, Input } from "@/components/ui/form"
import { ExternalLink } from "@/components/ui/external-link"

interface CostItem {
  title: string
  value: number
  icon: React.ElementType
}

// Add this mock data for the OpenAI API usage
const openAIUsageData = [
  { date: "Jan", credits: 1000 },
  { date: "Feb", credits: 1200 },
  { date: "Mar", credits: 900 },
  { date: "Apr", credits: 1500 },
  { date: "May", credits: 1800 },
  { date: "Jun", credits: 1600 },
]

export function CostTab() {
  const [costs] = useState<CostItem[]>([
    { title: "Créditos Totais", value: 5000, icon: Zap },
    { title: "Colaboradores IA", value: 2500, icon: MessageSquare },
    { title: "Chats Inteligentes", value: 1500, icon: MessageSquare },
    { title: "Agente IA Tráfego", value: 750, icon: TrendingUp },
    { title: "Agente IA Ligações", value: 250, icon: Phone },
  ])

  const costHistory = [
    { date: "Jan", totalCredits: 4000, collaborators: 2400, chats: 1600 },
    { date: "Fev", totalCredits: 4500, collaborators: 2700, chats: 1800 },
    { date: "Mar", totalCredits: 5000, collaborators: 3000, chats: 2000 },
    { date: "Abr", totalCredits: 4800, collaborators: 2900, chats: 1900 },
    { date: "Mai", totalCredits: 5200, collaborators: 3100, chats: 2100 },
    { date: "Jun", totalCredits: 5500, collaborators: 3300, chats: 2200 },
  ]

  const [apiKey, setApiKey] = useState("")
  const [tempApiKey, setTempApiKey] = useState("")
  const [isEditing, setIsEditing] = useState(false)

  const handleEdit = () => setIsEditing(true)
  const handleCancel = () => setIsEditing(false)
  const handleUpdate = () => {
    setApiKey(tempApiKey)
    setIsEditing(false)
  }

  return (
    <div>
      <div className="space-y-8">
        <div>
          <h2 className="text-2xl font-semibold text-white">Custos</h2>
          <p className="text-[#E8F3ED]/60 mt-1">Visão geral dos seus custos com créditos e uso de recursos.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {costs.map((cost, index) => (
            <CostCard key={index} {...cost} />
          ))}
        </div>

        <Card className="bg-[#0F0F10] border-[#272727]">
          <CardHeader className="flex flex-row items-center justify-between">
            <div className="space-y-1">
              <CardTitle className="text-white">OpenAI API</CardTitle>
              <p className="text-sm text-[#E8F3ED]/60">Configure sua chave de API da OpenAI</p>
            </div>
            <a
              href="https://platform.openai.com/api-keys"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#58E877] hover:text-[#4EDB82] text-sm flex items-center gap-2"
            >
              Adquira sua chave de API
              <ExternalLink className="h-4 w-4" />
            </a>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="relative">
              <Input
                type="password"
                placeholder="Cole aqui sua API Key"
                value={isEditing ? tempApiKey : apiKey}
                onChange={(e) => setTempApiKey(e.target.value)}
                disabled={!isEditing}
                className="bg-[#121214] border-[#272727] text-white pr-24"
              />
              {isEditing ? (
                <div className="absolute right-2 top-1/2 -translate-y-1/2 flex gap-2">
                  <Button
                    variant="ghost"
                    className="h-7 px-3 text-red-500 hover:text-red-400 hover:bg-red-500/10"
                    onClick={handleCancel}
                  >
                    Cancelar
                  </Button>
                  <Button className="h-7 px-3 bg-[#58E877] text-black hover:bg-[#4EDB82]" onClick={handleUpdate}>
                    Atualizar
                  </Button>
                </div>
              ) : (
                <Button
                  variant="ghost"
                  className="absolute right-2 top-1/2 -translate-y-1/2 h-7 px-3 text-[#58E877] hover:text-[#4EDB82] hover:bg-[#58E877]/10"
                  onClick={handleEdit}
                >
                  Editar
                </Button>
              )}
            </div>
            <div className="flex justify-between items-center bg-[#1a1a1c] p-4 rounded-lg">
              <span className="text-[#E8F3ED]/60">Total de créditos usados (últimos 6 meses)</span>
              <span className="text-white font-bold">
                {openAIUsageData.reduce((sum, item) => sum + item.credits, 0)} créditos
              </span>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-[#0F0F10] border-[#272727]">
          <CardHeader>
            <CardTitle className="text-white">Histórico de Custos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={costHistory}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                  <XAxis dataKey="date" stroke="#666" />
                  <YAxis stroke="#666" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#1a1a1c",
                      border: "1px solid rgba(255,255,255,0.1)",
                      borderRadius: "8px",
                    }}
                    itemStyle={{ color: "#fff" }}
                    labelStyle={{ color: "#fff" }}
                  />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="totalCredits"
                    stroke="#58E877"
                    strokeWidth={2}
                    name="Total de Créditos"
                  />
                  <Line
                    type="monotone"
                    dataKey="collaborators"
                    stroke="#4EDB82"
                    strokeWidth={2}
                    name="Colaboradores IA"
                  />
                  <Line type="monotone" dataKey="chats" stroke="#90EEB1" strokeWidth={2} name="Chats Inteligentes" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function CostCard({ title, value, icon: Icon }: CostItem) {
  return (
    <div>
      <Card className="bg-[#0F0F10] border-[#272727]">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium text-[#E8F3ED]/60">{title}</CardTitle>
          <Icon className="h-4 w-4 text-[#58E877]" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-white">{value} créditos</div>
        </CardContent>
      </Card>
    </div>
  )
}

