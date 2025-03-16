"use client"

import React from 'react';
import { TrendingUp, TrendingDown, Zap } from "lucide-react";
import {
  Label,
  PolarGrid,
  PolarRadiusAxis,
  RadialBar,
  RadialBarChart,
} from "recharts";

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ChartConfig, ChartContainer } from "@/components/ui/chart";

interface EfficiencyCardProps {
  efficiency: number;
  comparison?: {
    current: number;
    previous: number;
  };
}

export default function EfficiencyCard({ efficiency, comparison }: EfficiencyCardProps) {
  // Calcular mudança percentual se houver dados anteriores
  const percentChange = comparison 
    ? ((comparison.current - comparison.previous) / comparison.previous) * 100 
    : 0;
  
  // Determinar a cor baseada na eficiência
  const getEfficiencyColor = (value: number) => {
    if (value >= 80) return '#5DE97B'; // Verde claro para alta eficiência
    if (value >= 50) return '#E88D30'; // Amarelo/laranja para média eficiência
    return '#FF4D4F';                 // Vermelho para baixa eficiência
  };
  
  // Gerar dados para o gráfico
  const chartData = [
    { 
      name: "efficiency", 
      value: efficiency, 
      fill: getEfficiencyColor(efficiency)
    },
  ];

  const chartConfig = {
    efficiency: {
      label: "Eficiência",
      color: getEfficiencyColor(efficiency),
    },
  } satisfies ChartConfig;

  // Função para determinar a cor e ícone da tendência
  const getTrendColor = (change: number) => {
    if (change > 0) return 'text-green-500';
    if (change < 0) return 'text-red-500';
    return 'text-gray-400';
  };
  
  const TrendIcon = percentChange > 0 ? TrendingUp : TrendingDown;
  
  // Texto de tendência
  const trendText = percentChange === 0 
    ? "Sem alteração em relação ao período anterior" 
    : `${percentChange > 0 ? 'Aumento' : 'Redução'} de ${Math.abs(percentChange).toFixed(1)}% vs. período anterior`;
  
  return (
    <Card className="flex flex-col bg-[#0f0f0f] border-[#222224] overflow-hidden">
      <CardHeader className="items-center pb-0">
        <CardTitle className="text-xl font-medium text-gray-100">Eficiência de Tokens</CardTitle>
        <CardDescription className="text-[#adadad]">
          Relação entre tokens de saída e entrada (output/input)
        </CardDescription>
      </CardHeader>
      <CardContent className="flex-1 pb-0">
        <ChartContainer
          config={chartConfig}
          className="mx-auto aspect-square max-h-[250px]"
        >
          <RadialBarChart
            data={chartData}
            startAngle={180}
            endAngle={0}
            innerRadius={80}
            outerRadius={140}
            barSize={20}
          >
            <PolarGrid
              gridType="circle"
              radialLines={false}
              stroke="none"
              className="first:fill-muted last:fill-background"
              polarRadius={[86, 74]}
            />
            <RadialBar 
              dataKey="value" 
              background={{ fill: '#1a1a1c' }}
              cornerRadius={15}
            />
            <PolarRadiusAxis tick={false} tickLine={false} axisLine={false}>
              <Label
                content={({ viewBox }) => {
                  if (viewBox && "cx" in viewBox && "cy" in viewBox) {
                    return (
                      <text
                        x={viewBox.cx}
                        y={viewBox.cy}
                        textAnchor="middle"
                        dominantBaseline="middle"
                      >
                        <tspan
                          x={viewBox.cx}
                          y={(viewBox.cy as number) - 10}
                          className="fill-foreground text-4xl font-bold"
                        >
                          {efficiency}%
                        </tspan>
                        <tspan
                          x={viewBox.cx}
                          y={(viewBox.cy as number) + 24}
                          className="fill-muted-foreground text-sm"
                        >
                          Eficiência
                        </tspan>
                      </text>
                    )
                  }
                }}
              />
            </PolarRadiusAxis>
          </RadialBarChart>
        </ChartContainer>
      </CardContent>
      <CardFooter className="flex-col gap-2 text-sm pt-4">
        {comparison && (
          <div className="flex items-center gap-2 font-medium leading-none">
            {trendText} <TrendIcon className={`h-4 w-4 ${getTrendColor(percentChange)}`} />
          </div>
        )}
        <div className="leading-none text-muted-foreground text-[#adadad]">
          Uma eficiência maior indica prompts mais otimizados
        </div>
      </CardFooter>
    </Card>
  );
} 