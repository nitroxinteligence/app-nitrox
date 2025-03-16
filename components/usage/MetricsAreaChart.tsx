"use client"

import * as React from "react"
import { Area, AreaChart, CartesianGrid, XAxis } from "recharts"

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  ChartConfig,
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

interface MetricsData {
  inputTokens: number[];
  outputTokens: number[];
  requisicoes: number[];
  totalCosts: number[];
  dates: string[];
}

interface MetricsAreaChartProps {
  data: MetricsData;
}

const chartConfig = {
  metrics: {
    label: "Métricas",
  },
  inputTokens: {
    label: "Input Tokens",
    color: "#5DE97B",
  },
  outputTokens: {
    label: "Output Tokens",
    color: "#088737",
  },
  requisicoes: {
    label: "Requisições",
    color: "#E95DE2",
  },
  totalCosts: {
    label: "Custos Totais",
    color: "#FFD700",
  },
} satisfies ChartConfig

// Componente de tooltip personalizado similar ao da Evolução de Leads
const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    // Obter a data original do primeiro item do payload
    const originalDate = payload[0]?.payload?.date || label;
    
    return (
      <div className="bg-[#1E1E1E] border border-[#272727] rounded-lg p-3 shadow-lg">
        <p className="text-[#E8F3ED] text-sm font-medium mb-2">
          {
            // Se label já estiver formatado como "14 de mar." usar diretamente
            label.includes(" de ") ? label :
            // Caso contrário, fazer a formatação
            new Date(originalDate).toLocaleDateString('pt-BR', {
              day: 'numeric',
              month: 'short',
              year: 'numeric'
            })
          }
        </p>
        {payload.map((item: any, index: number) => {
          const metricKey = item.dataKey;
          const metricConfig = chartConfig[metricKey as keyof typeof chartConfig];
          
          let valueDisplay = item.value;
          // Formatação especial para certos tipos de métricas
          if (metricKey === 'totalCosts') {
            // Garantir que o valor é um número e formatá-lo como moeda
            const costValue = typeof item.value === 'string' 
              ? parseFloat(item.value) 
              : (item.value || 0);
            
            // Usar formatação de moeda com Intl para um visual mais profissional
            valueDisplay = new Intl.NumberFormat('en-US', {
              style: 'currency',
              currency: 'USD',
              minimumFractionDigits: 2,
              maximumFractionDigits: 4 // Permitir até 4 casas decimais para valores pequenos
            }).format(costValue);
          } else {
            // Para valores grandes (tokens), usar formatação com separadores de milhares
            const numValue = Number(item.value);
            if (!isNaN(numValue) && numValue > 999) {
              valueDisplay = numValue.toLocaleString('pt-BR');
            }
          }
          
          return (
            <div key={index} className="flex items-center gap-2 text-sm py-1">
              <div 
                className="w-2 h-2 rounded-full" 
                style={{ backgroundColor: metricConfig.color }}
              />
              <span className="text-[#E8F3ED]">{metricConfig.label}:</span>
              <span className={`text-[#E8F3ED] font-medium ${metricKey === 'totalCosts' ? 'text-[#FFD700]' : ''}`}>
                {valueDisplay}
              </span>
            </div>
          );
        })}
      </div>
    );
  }
  return null;
};

// Função para processar os dados e formatá-los para o gráfico
const processChartData = (metricsData: MetricsData, selectedMetrics: string[]) => {
  if (!metricsData.dates || metricsData.dates.length === 0) {
    console.warn('Nenhuma data disponível para processamento no gráfico');
    return [];
  }

  // Log para diagnóstico de custos
  if (selectedMetrics.includes('totalCosts')) {
    console.log('Processando dados de custos para o gráfico:', 
      metricsData.dates.map((date, i) => `${date}: $${metricsData.totalCosts[i].toFixed(4)}`));
      
    // Verificar se há valores significativos nos custos
    const hasCosts = metricsData.totalCosts.some(cost => cost > 0);
    if (!hasCosts) {
      console.warn('⚠️ AVISO: Nenhum valor de custo significativo encontrado para exibição no gráfico');
    } else {
      console.log('✓ Valores de custo encontrados e prontos para exibição no gráfico');
    }
  }
  
  // Formatar as datas para uma exibição mais amigável
  const formatDate = (dateStr: string) => {
    try {
      // Converter YYYY-MM-DD para DD de MMM
      const date = new Date(dateStr);
      return new Intl.DateTimeFormat('pt-BR', {
        day: '2-digit',
        month: 'short'
      }).format(date);
    } catch (e) {
      console.error('Erro ao formatar data:', dateStr, e);
      return dateStr;
    }
  };
  
  return metricsData.dates.map((date, index) => {
    const result: any = { 
      date,
      formattedDate: formatDate(date) // Adicionar data formatada para exibição
    };
    
    selectedMetrics.forEach(metric => {
      if (metric in metricsData) {
        const value = metricsData[metric as keyof MetricsData][index];
        
        // Certificar-se que temos um valor numérico válido para exibição
        if (metric === 'totalCosts') {
          // Garantir valor numérico para custos e arredondar para 4 casas decimais
          // para maior precisão em valores pequenos
          result[metric] = typeof value === 'number' ? 
            parseFloat(value.toFixed(4)) : 
            (parseFloat(value) || 0);
        } else {
          // Para outros valores, manter como estão
          result[metric] = value;
        }
      }
    });
    
    return result;
  });
};

export default function MetricsAreaChart({ data }: MetricsAreaChartProps) {
  const [timeRange, setTimeRange] = React.useState("all");
  const [selectedMetrics, setSelectedMetrics] = React.useState<string[]>(["inputTokens", "outputTokens", "requisicoes", "totalCosts"]);
  
  // Log detalhado para diagnóstico ao inicializar o componente
  React.useEffect(() => {
    if (data.totalCosts && data.totalCosts.length > 0 && data.dates.length > 0) {
      console.log('=== VALORES DE CUSTO NO GRÁFICO ===');
      data.dates.forEach((date, index) => {
        const cost = data.totalCosts[index];
        if (cost > 0) {
          console.log(`Data: ${date}, Custo: $${cost.toFixed(2)}`);
        }
      });
    }
  }, [data]);
  
  // Processar dados para o gráfico
  const chartData = React.useMemo(() => {
    // Criar array de objetos com todos os dados
    const processedData = processChartData(data, selectedMetrics);
    
    // Filtrar baseado no período selecionado
    if (timeRange === "all") return processedData;
    
    const currentDate = new Date();
    const lastDate = new Date(data.dates[data.dates.length - 1]);
    const referenceDate = lastDate > currentDate ? lastDate : currentDate;
    
    let daysToSubtract = 30;
    if (timeRange === "7d") {
      daysToSubtract = 7;
    } else if (timeRange === "14d") {
      daysToSubtract = 14;
    }
    
    const startDate = new Date(referenceDate);
    startDate.setDate(startDate.getDate() - daysToSubtract);
    
    return processedData.filter(item => {
      const date = new Date(item.date);
      return date >= startDate;
    });
  }, [data, timeRange, selectedMetrics]);
  
  // Toggle para seleção de métricas
  const toggleMetric = (metric: string) => {
    if (selectedMetrics.includes(metric)) {
      if (selectedMetrics.length > 1) { // Garantir que pelo menos 1 métrica esteja selecionada
        setSelectedMetrics(selectedMetrics.filter(m => m !== metric));
      }
    } else {
      setSelectedMetrics([...selectedMetrics, metric]);
    }
  };
  
  // Lista de métricas disponíveis para seleção
  const availableMetrics = [
    { key: "inputTokens", label: "Input Tokens" },
    { key: "outputTokens", label: "Output Tokens" },
    { key: "requisicoes", label: "Requisições" },
    { key: "totalCosts", label: "Custos Totais" },
  ];

  return (
    <Card className="bg-[#0f0f0f] border-[#222224] overflow-hidden">
      <CardHeader className="flex items-center gap-2 space-y-0 border-b border-[#272727] py-4 sm:flex-row">
        <div className="grid flex-1 gap-1 text-center sm:text-left">
          <CardTitle className="text-lg font-medium text-gray-100">Evolução de Métricas</CardTitle>
          <CardDescription className="text-[#adadad]">
            Visualização histórica das métricas selecionadas
          </CardDescription>
        </div>
        <Select value={timeRange} onValueChange={setTimeRange}>
          <SelectTrigger
            className="w-[160px] rounded-lg bg-[#14141A] border-[#272727] text-white sm:ml-auto"
            aria-label="Selecionar período"
          >
            <SelectValue placeholder="Todo o período" />
          </SelectTrigger>
          <SelectContent className="rounded-xl bg-[#14141A] border-[#272727] text-white">
            <SelectItem value="all" className="rounded-lg">
              Todo o período
            </SelectItem>
            <SelectItem value="30d" className="rounded-lg">
              Últimos 30 dias
            </SelectItem>
            <SelectItem value="14d" className="rounded-lg">
              Últimos 14 dias
            </SelectItem>
            <SelectItem value="7d" className="rounded-lg">
              Últimos 7 dias
            </SelectItem>
          </SelectContent>
        </Select>
      </CardHeader>
      
      <div className="flex flex-wrap gap-2 p-4 border-b border-[#272727]">
        {availableMetrics.map(metric => (
          <button
            key={metric.key}
            onClick={() => toggleMetric(metric.key)}
            className={`px-3 py-1.5 text-xs rounded-full transition-colors ${
              selectedMetrics.includes(metric.key) 
                ? 'bg-[#14141A] text-white' 
                : 'bg-[#0a0a0a] text-[#adadad] border border-[#272727]'
            }`}
          >
            {metric.label}
          </button>
        ))}
      </div>
      
      <CardContent className="px-2 pt-4 sm:px-4 sm:pt-6">
        <ChartContainer
          config={chartConfig}
          className="aspect-auto h-[280px] w-full"
        >
          <AreaChart data={chartData}>
            <defs>
              {Object.entries(chartConfig).map(([key, config]) => {
                if (key !== 'metrics' && selectedMetrics.includes(key)) {
                  return (
                    <linearGradient key={key} id={`fill${key}`} x1="0" y1="0" x2="0" y2="1">
                      <stop
                        offset="5%"
                        stopColor={config.color}
                        stopOpacity={0.8}
                      />
                      <stop
                        offset="95%"
                        stopColor={config.color}
                        stopOpacity={0.1}
                      />
                    </linearGradient>
                  );
                }
                return null;
              })}
            </defs>
            <CartesianGrid vertical={false} stroke="#272727" />
            <XAxis
              dataKey="formattedDate"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              minTickGap={16}
              stroke="#adadad"
              ticks={chartData.map(d => d.formattedDate)}
              allowDataOverflow={false}
              interval="preserveEnd"
            />
            <ChartTooltip
              cursor={false}
              content={<CustomTooltip />}
            />
            
            {selectedMetrics.map(metric => (
              <Area
                key={metric}
                dataKey={metric}
                type="monotone"
                fill={`url(#fill${metric})`}
                stroke={chartConfig[metric as keyof typeof chartConfig]?.color || "#fff"}
                strokeWidth={2}
              />
            ))}
            
            <ChartLegend content={<ChartLegendContent />} />
          </AreaChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
} 