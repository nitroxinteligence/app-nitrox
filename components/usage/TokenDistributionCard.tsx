"use client"

import * as React from 'react';
import { Label, Pie, PieChart, Sector } from "recharts";
import { PieSectorDataItem } from "recharts/types/polar/Pie";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ChartConfig,
  ChartContainer,
  ChartStyle,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { BarChart3 } from 'lucide-react';

interface TokenDistributionProps {
  inputTokens: number;
  outputTokens: number;
  cachedTokens: number;
}

// Definição das cores e configurações do gráfico
const chartConfig = {
  tokens: {
    label: "Tokens",
  },
  input: {
    label: "Input Tokens",
    color: "#5DE97B",
  },
  output: {
    label: "Output Tokens",
    color: "#088737",
  },
  cached: {
    label: "Tokens Cacheados",
    color: "#106A2E",
  },
} satisfies ChartConfig;

// Componente de tooltip personalizado
const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length > 0) {
    const data = payload[0].payload;
    const type = data.type;
    const tokens = data.tokens;
    
    // Determinar o label e a cor com base no tipo
    let label = "";
    let color = "";
    
    switch (type) {
      case 'input':
        label = "Input Tokens";
        color = "#5DE97B";
        break;
      case 'output':
        label = "Output Tokens";
        color = "#088737";
        break;
      case 'cached':
        label = "Tokens Cacheados";
        color = "#106A2E";
        break;
      default:
        label = type;
        color = "#5DE97B";
    }
    
    return (
      <div className="bg-[#1E1E1E] border border-[#272727] rounded-lg p-3 shadow-lg">
        <div className="flex items-center gap-2 text-sm py-1">
          <div 
            className="w-2 h-2 rounded-full" 
            style={{ backgroundColor: color }}
          />
          <span className="text-[#E8F3ED]">{label}:</span>
          <span className="text-[#E8F3ED] font-medium">
            {tokens.toLocaleString('pt-BR')}
          </span>
        </div>
      </div>
    );
  }
  
  return null;
};

export default function TokenDistributionCard({ inputTokens, outputTokens, cachedTokens }: TokenDistributionProps) {
  const id = "token-distribution-pie";
  
  // Garantir que os valores sejam números válidos
  const validInput = isNaN(inputTokens) ? 0 : Math.max(0, inputTokens);
  const validOutput = isNaN(outputTokens) ? 0 : Math.max(0, outputTokens);
  const validCached = isNaN(cachedTokens) ? 0 : Math.max(0, cachedTokens);
  
  // CORREÇÃO: Calcular total de tokens explicitamente 
  const totalTokens = validInput + validOutput + validCached;
  console.log(`TokenDistributionCard - Total Tokens: ${totalTokens} (Input: ${validInput}, Output: ${validOutput}, Cached: ${validCached})`);
  
  // Preparar os dados para o gráfico
  const tokenData = React.useMemo(() => [
    { type: 'input', tokens: validInput, fill: "#5DE97B" },
    { type: 'output', tokens: validOutput, fill: "#088737" },
    { type: 'cached', tokens: validCached, fill: "#106A2E" }
  ].filter(item => item.tokens > 0), [validInput, validOutput, validCached]);
  
  const [activeType, setActiveType] = React.useState<string>(tokenData.length > 0 ? tokenData[0].type : 'input');
  
  const activeIndex = React.useMemo(
    () => tokenData.findIndex((item) => item.type === activeType),
    [activeType, tokenData]
  );
  
  const tokenTypes = React.useMemo(() => tokenData.map((item) => item.type), [tokenData]);
  
  // Função para obter um label amigável para os tipos de token
  const getTypeLabel = (type: string): string => {
    switch (type) {
      case 'input': return 'Input Tokens';
      case 'output': return 'Output Tokens';
      case 'cached': return 'Tokens Cacheados';
      default: return type;
    }
  };
  
  // Calcular porcentagem
  const getPercentage = (value: number): string => {
    if (totalTokens === 0) return '0%';
    return `${((value / totalTokens) * 100).toFixed(1)}%`;
  };
  
  // Renderizar mensagem de dados vazios quando não há tokens
  if (totalTokens === 0) {
    return (
      <Card className="bg-[#0f0f0f] border-[#222224] overflow-hidden">
        <CardHeader>
          <CardTitle className="text-xl font-medium text-gray-100">
            Distribuição de Tokens
          </CardTitle>
          <CardDescription className="text-[#adadad]">
            Proporção entre tokens de entrada, saída e cacheados
          </CardDescription>
        </CardHeader>
        
        <CardContent>
          <div className="h-60 flex flex-col items-center justify-center">
            <BarChart3 className="h-12 w-12 text-gray-600 opacity-50 mb-4" />
            <p className="text-[#adadad]">Nenhum dado de tokens disponível</p>
          </div>
        </CardContent>
      </Card>
    );
  }
  
  return (
    <Card data-chart={id} className="bg-[#0f0f0f] border-[#222224] overflow-hidden">
      <ChartStyle id={id} config={chartConfig} />
      <CardHeader className="flex-row items-start space-y-0 pb-0">
        <div className="grid gap-1">
          <CardTitle className="text-xl font-medium text-gray-100">Distribuição de Tokens</CardTitle>
          <CardDescription className="text-[#adadad]">
            Proporção entre tokens de entrada, saída e cacheados
          </CardDescription>
        </div>
        <Select value={activeType} onValueChange={setActiveType}>
          <SelectTrigger
            className="ml-auto h-7 w-[150px] rounded-lg pl-2.5 bg-[#14141A] border-[#222224] text-white"
            aria-label="Selecionar tipo de token"
          >
            <SelectValue placeholder="Selecionar tipo" />
          </SelectTrigger>
          <SelectContent align="end" className="rounded-xl bg-[#14141A] border-[#222224] text-white">
            {tokenTypes.map((type) => (
              <SelectItem
                key={type}
                value={type}
                className="rounded-lg [&_span]:flex"
              >
                <div className="flex items-center gap-2 text-xs">
                  <span
                    className="flex h-3 w-3 shrink-0 rounded-sm"
                    style={{
                      backgroundColor: type === 'input' ? "#5DE97B" : 
                                      type === 'output' ? "#088737" : "#106A2E",
                    }}
                  />
                  {getTypeLabel(type)}
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </CardHeader>
      <CardContent className="flex flex-1 justify-center pb-0">
        <ChartContainer
          id={id}
          config={chartConfig}
          className="mx-auto aspect-square w-full max-w-[300px]"
        >
          <PieChart>
            <ChartTooltip
              cursor={false}
              content={<CustomTooltip />}
            />
            <Pie
              data={tokenData}
              dataKey="tokens"
              nameKey="type"
              innerRadius={60}
              strokeWidth={5}
              activeIndex={activeIndex}
              activeShape={({
                outerRadius = 0,
                ...props
              }: PieSectorDataItem) => (
                <g>
                  <Sector {...props} outerRadius={outerRadius + 10} />
                  <Sector
                    {...props}
                    outerRadius={outerRadius + 25}
                    innerRadius={outerRadius + 12}
                  />
                </g>
              )}
            >
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
                          y={viewBox.cy}
                          className="fill-foreground text-2xl font-bold"
                        >
                          {activeIndex >= 0 ? tokenData[activeIndex].tokens.toLocaleString() : 0}
                        </tspan>
                        <tspan
                          x={viewBox.cx}
                          y={(viewBox.cy || 0) + 22}
                          className="fill-muted-foreground text-xs"
                        >
                          {activeIndex >= 0 ? getTypeLabel(tokenData[activeIndex].type) : ''}
                        </tspan>
                      </text>
                    )
                  }
                }}
              />
            </Pie>
          </PieChart>
        </ChartContainer>
      </CardContent>
      {/* Adicionar informação do total de tokens */}
      <div className="text-center mt-2 mb-2">
        <span className="text-xs text-[#adadad]">Total de Tokens:</span>
        <span className="text-lg font-medium text-white ml-2">{totalTokens.toLocaleString()}</span>
      </div>
      <div className="grid grid-cols-3 gap-4 mt-2 p-4">
        <div className="flex flex-col items-center">
          <span className="text-xs text-[#adadad]">Input Tokens</span>
          <span className="text-lg font-medium text-white">{validInput.toLocaleString()}</span>
          <span className="text-xs text-[#adadad]">{getPercentage(validInput)}</span>
        </div>
        <div className="flex flex-col items-center">
          <span className="text-xs text-[#adadad]">Output Tokens</span>
          <span className="text-lg font-medium text-white">{validOutput.toLocaleString()}</span>
          <span className="text-xs text-[#adadad]">{getPercentage(validOutput)}</span>
        </div>
        <div className="flex flex-col items-center">
          <span className="text-xs text-[#adadad]">Tokens Cacheados</span>
          <span className="text-lg font-medium text-white">{validCached.toLocaleString()}</span>
          <span className="text-xs text-[#adadad]">{getPercentage(validCached)}</span>
        </div>
      </div>
    </Card>
  );
} 