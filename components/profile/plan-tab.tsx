"use client"

import { useState } from "react"
import { Check, Package, UserPlus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import type { Plan } from "@/types/profile"
import { TooltipProvider } from "@radix-ui/react-tooltip"
import { motion } from "framer-motion"

// Updated plans data
export const plans: Plan[] = [
  {
    name: "ESSENTIAL",
    price: 997,
    credits: 700,
    features: [
      {
        title: "Créditos disponíveis",
        items: ["700 créditos/mês"],
      },
      {
        title: "Colaborador IA",
        items: [
          "1 Colaborador IA",
          "Envio de Áudios: até 30 minutos de áudio gerado/mês",
          "Envio de Imagens/Documentos: até 60 imagens/documentos/mês",
          "Mensagens no WhatsApp: até 500 mensagens/mês (input/output)",
        ],
      },
      {
        title: "Colaborador IA para IA Ligações",
        items: ["Até 40 chamadas/mês (média de 5 minutos por ligação)"],
      },
      {
        title: "Colaborador IA para Tráfego Pago",
        items: [
          "Criação de Campanhas: até 10 campanhas/mês",
          "Análise de Dados: até 20 relatórios/mês",
          "Otimizações Automatizadas: até 25 otimizações/mês",
        ],
      },
      {
        title: "Chats Inteligentes",
        items: ["150 interações/mês"],
      },
    ],
    subheadline:
      "Usuários iniciantes que querem experimentar agentes de IA para WhatsApp, ligações, chats inteligentes e tráfego pago com volume limitado. Ideal para negócios de pequeno porte ou uso inicial de IA no atendimento.",
  },
  {
    name: "PRO",
    price: 1997,
    credits: 2000,
    features: [
      {
        title: "Créditos disponíveis",
        items: ["2.000 créditos/mês"],
      },
      {
        title: "Colaboradores IA",
        items: [
          "2 Colaboradores IA",
          "Envio de Áudios: até 100 minutos de áudio gerado/mês",
          "Envio de Imagens/Documentos: até 200 imagens/documentos/mês",
          "Mensagens no WhatsApp: até 1.500 mensagens/mês",
        ],
      },
      {
        title: "Colaborador IA para Ligações",
        items: ["Até 150 chamadas/mês (média de 5 minutos por ligação)"],
      },
      {
        title: "Colaborador IA para Tráfego Pago",
        items: [
          "Criação de Campanhas: até 30 campanhas/mês",
          "Análise de Dados: até 60 relatórios/mês",
          "Otimizações Automatizadas: até 75 otimizações/mês",
        ],
      },
      {
        title: "Chats Inteligentes",
        items: ["600 interações/mês"],
      },
    ],
    isPopular: true,
    subheadline:
      "Empresas de médio porte ou startups que querem integrar IA no atendimento por WhatsApp, agregar soluções de ligações, chats inteligentes e tráfego pago para conversas de maior escala.",
  },
  {
    name: "ENTERPRISE",
    price: 3997,
    credits: 5500,
    features: [
      {
        title: "Créditos disponíveis",
        items: ["5.500 créditos/mês"],
      },
      {
        title: "Colaboradores IA",
        items: [
          "3 Colaboradores IA",
          "Envio de Áudios: até 450 minutos de áudio gerado/mês",
          "Envio de Imagens/Documentos: até 550 imagens/documentos/mês",
          "Mensagens no WhatsApp: até 5.500 mensagens/mês",
        ],
      },
      {
        title: "Colaborador IA para Ligações",
        items: ["Até 350 chamadas/mês (média de 5 minutos por ligação)"],
      },
      {
        title: "Colaborador IA para Tráfego Pago",
        items: [
          "Criação de Campanhas: até 100 campanhas/mês",
          "Análise de Dados: até 200 relatórios/mês",
          "Otimizações Automatizadas: até 250 otimizações/mês",
        ],
      },
      {
        title: "Chats Inteligentes",
        items: ["até 1.750 interações/mês"],
      },
    ],
    subheadline:
      "Empresas de grande porte ou operações escaláveis de IA em vendas, suporte, campanhas automatizadas e tráfego pago. Ideal para alta demanda em WhatsApp, chamadas, chatbots e tráfego pago.",
  },
]

const creditPacks = [
  { credits: 100, price: 100, name: "Pacote Pequeno de Créditos" },
  { credits: 300, price: 250, name: "Pacote Médio de Créditos" },
  { credits: 700, price: 500, name: "Pacote Grande de Créditos" },
]

export function PlanTab() {
  const [currentPlan] = useState<Plan>(plans[0])

  const iconGradient = "url(#iconGradient)"

  return (
    <TooltipProvider>
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
        <div className="space-y-12">
          {/* Current Plan Section */}
          <section className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-semibold text-white">Plano Atual</h2>
                <p className="text-[#E8F3ED]/60 mt-1">Você está no plano {currentPlan.name}</p>
              </div>
              <div className="flex gap-4">
                <div className="relative group">
                  <button className="relative inline-block p-px font-normal text-[1rem] leading-6 text-white bg-gray-800 shadow-2xl cursor-pointer rounded-xl shadow-zinc-900 transition-transform duration-300 ease-in-out hover:scale-105 active:scale-95">
                    <span className="absolute inset-0 rounded-xl bg-gradient-to-r from-[#58E877] to-[#E8F3ED] p-[2px] opacity-0 transition-opacity duration-500 group-hover:opacity-100"></span>

                    <span className="relative z-10 block px-5 py-2.5 rounded-xl bg-[#0B0B0B] border border-[#181818] text-sm">
                      <div className="relative z-10 flex items-center justify-center">
                        <span className="transition-all duration-500 text-sm bg-gradient-to-r from-[#58E877] to-[#E8F3ED] bg-clip-text text-transparent">
                          Alterar forma de pagamento
                        </span>
                      </div>
                    </span>
                  </button>
                </div>
              </div>
            </div>

            {/* Plan Features */}
            <Card className="bg-[#0F0F10] border-[#272727]">
              <CardHeader>
                <CardTitle className="text-white">Recursos do seu plano</CardTitle>
                <CardDescription>Confira os recursos disponíveis no seu plano atual</CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="grid gap-4 sm:grid-cols-2">
                  {currentPlan.features.map((feature, i) => (
                    <li key={i} className="text-[#E8F3ED]/60 text-sm">
                      {" "}
                      {/* Changed to nested list */}
                      <div className="flex items-center gap-2 mb-2">
                        <Check className="h-4 w-4 text-[#58E877]" />
                        <span className="font-medium">{feature.title}</span>
                      </div>
                      <ul className="ml-6 list-disc">
                        {feature.items.map((item, j) => (
                          <li key={j}>{item}</li>
                        ))}
                      </ul>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </section>

          {/* Available Plans */}
          <section className="space-y-6">
            <h2 className="text-2xl font-semibold text-white">Planos Disponíveis</h2>
            <div className="grid gap-6 lg:grid-cols-3">
              {plans.map((plan) => (
                <Card
                  key={plan.name}
                  className={cn(
                    "relative overflow-hidden bg-[#0F0F10] p-1 rounded-[10px] border-0",
                    plan.name === "PRO" && "border-[1px] border-[#333333]",
                    "after:absolute after:inset-0 after:bg-[#101012] after:rounded-[9px] after:-z-10",
                    plan.isPopular ? "scale-105 shadow-lg shadow-[#333333]/20" : "transition-transform duration-200",
                    currentPlan.name === plan.name && "opacity-70 cursor-not-allowed",
                  )}
                >
                  <svg className="absolute -top-px -left-px w-px h-px overflow-visible" viewBox="0 0 4 4">
                    <defs>
                      <linearGradient id="iconGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#58E877" />
                        <stop offset="100%" stopColor="#E8F3ED" />
                      </linearGradient>
                    </defs>
                  </svg>
                  {plan.isPopular && (
                    <div className="absolute right-4 top-4 rounded-full bg-[#58E877] px-3 py-1 text-xs font-medium text-black">
                      Custo benefício
                    </div>
                  )}
                  <CardHeader className="px-8 pt-8">
                    <CardTitle className="text-[#58E877] text-lg">{plan.name}</CardTitle>
                    <CardDescription className="text-[#E8F3ED]/60 text-sm mt-1">
                      {" "}
                      {/* Added subheadline display */}
                      {plan.subheadline}
                    </CardDescription>
                    <CardDescription className="mt-2">
                      <span className="text-4xl font-bold text-white">R${plan.price}</span>
                      {plan.price > 0 && <span className="text-[#E8F3ED]/60 text-base">/mês</span>}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="px-8 pb-8">
                    <ul className="grid gap-4 mt-6">
                      {plan.features.map((feature, i) => (
                        <li key={i} className="text-[#E8F3ED]/60 text-sm">
                          <div className="flex items-center gap-2 mb-2">
                            <Check className="h-4 w-4 text-[#58E877]" stroke={iconGradient} />
                            <span className="font-medium">{feature.title}</span>
                          </div>
                          <ul className="ml-6 list-disc">
                            {feature.items.map((item, j) => (
                              <li key={j}>{item}</li>
                            ))}
                          </ul>
                        </li>
                      ))}
                    </ul>
                    <Button
                      className={`mt-8 w-full ${
                        plan.isPopular
                          ? "bg-[#58E877] text-black hover:bg-[#4EDB82]"
                          : "border border-[#58E877] text-white hover:bg-[#58E877] hover:text-black"
                      } rounded-full`}
                      disabled={currentPlan.name === plan.name}
                    >
                      {currentPlan.name === plan.name ? "Plano Atual" : "Escolher Plano"}
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>

          {/* Credit Packs */}
          <section className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-semibold text-white">Comprar Créditos</h2>
              <div className="relative group">
                <button className="relative inline-block p-px font-normal text-[1rem] leading-6 text-white bg-gray-800 shadow-2xl cursor-pointer rounded-xl shadow-zinc-900 transition-transform duration-300 ease-in-out hover:scale-105 active:scale-95">
                  <span className="absolute inset-0 rounded-xl bg-gradient-to-r from-[#58E877] to-[#E8F3ED] p-[2px] opacity-0 transition-opacity duration-500 group-hover:opacity-100"></span>

                  <span className="relative z-10 block px-5 py-2.5 rounded-xl bg-[#0B0B0B] border border-[#181818] text-sm">
                    <div className="relative z-10 flex items-center justify-center">
                      <span className="transition-all duration-500 text-sm bg-gradient-to-r from-[#58E877] to-[#E8F3ED] bg-clip-text text-transparent">
                        Quero mais créditos
                      </span>
                    </div>
                  </span>
                </button>
              </div>
            </div>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {creditPacks.map((pack) => (
                <Card
                  key={pack.credits}
                  className="bg-[#0F0F10] border border-transparent hover:border-[#58E877] transition-all duration-200"
                >
                  <CardHeader className="flex flex-col items-center justify-center py-6">
                    <div className="w-12 h-12 rounded-full bg-[#1a1a1c] border border-[#272727] flex items-center justify-center mb-4">
                      <Package className="h-6 w-6 text-[#58E877]" stroke={iconGradient} />
                    </div>
                    <CardTitle className="text-white text-lg">{pack.credits} créditos</CardTitle>
                    <CardDescription className="mt-1">
                      <span className="text-2xl font-bold text-white">R${pack.price}</span>
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="pt-2 pb-8">
                    <div className="relative group">
                      <button className="relative inline-block p-px font-normal text-[1rem] leading-6 text-white bg-gray-800 shadow-2xl cursor-pointer rounded-xl shadow-zinc-900 transition-transform duration-300 ease-in-out hover:scale-105 active:scale-95 w-full">
                        <span className="absolute inset-0 rounded-xl bg-gradient-to-r from-white to-[#E8F3ED] p-[2px] opacity-0 transition-opacity duration-500 group-hover:opacity-100"></span>

                        <span className="relative z-10 block px-5 py-2.5 rounded-xl bg-[#0B0B0B] border border-[#181818] text-sm">
                          <div className="relative z-10 flex items-center justify-center">
                            <span className="transition-all duration-500 text-sm text-white">Comprar Agora</span>
                          </div>
                        </span>
                      </button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>

          {/* AI Collaborator */}
          <section className="space-y-6 mt-12">
            <h2 className="text-2xl font-semibold text-white">Adicionar Colaborador IA</h2>
            <div className="flex justify-start">
              <Card className="bg-[#0F0F10] border border-transparent hover:border-[#58E877] transition-all duration-200 w-full sm:w-[calc(50%-12px)] lg:w-[calc(33.333%-16px)]">
                <CardHeader className="flex flex-col items-center justify-center py-8">
                  <div className="w-12 h-12 rounded-full bg-[#1a1a1c] border border-[#272727] flex items-center justify-center mb-4">
                    <UserPlus className="h-6 w-6 text-[#58E877] m-auto" stroke={iconGradient} />
                  </div>
                  <CardTitle className="text-white text-lg">Colaborador IA Adicional</CardTitle>
                  <CardDescription className="mt-1">
                    <span className="text-2xl font-bold text-white">R$ 997</span>
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-2 pb-8">
                  <div className="relative group">
                    <button className="relative inline-block p-px font-normal text-[1rem] leading-6 text-white bg-gray-800 shadow-2xl cursor-pointer rounded-xl shadow-zinc-900 transition-transform duration-300 ease-in-out hover:scale-105 active:scale-95 w-full">
                      <span className="absolute inset-0 rounded-xl bg-gradient-to-r from-white to-[#E8F3ED] p-[2px] opacity-0 transition-opacity duration-500 group-hover:opacity-100"></span>

                      <span className="relative z-10 block px-5 py-2.5 rounded-xl bg-[#0B0B0B] border border-[#181818] text-sm">
                        <div className="relative z-10 flex items-center justify-center">
                          <span className="transition-all duration-500 text-sm text-white">Adicionar Agente</span>
                        </div>
                      </span>
                    </button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </section>
        </div>
      </motion.div>
    </TooltipProvider>
  )
}

