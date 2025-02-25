import { useState, useEffect } from "react"
import { Calendar } from "@/components/ui/calendar"
import { DateRange } from "react-day-picker"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"
import { Button } from "@/components/ui/button"
import { Calendar as CalendarIcon, X } from "lucide-react"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { cn } from "@/lib/utils"

interface DateFilterProps {
  onDateRangeChange: (range: DateRange | undefined) => void
  className?: string
}

export function DateFilter({ onDateRangeChange, className }: DateFilterProps) {
  const [dateRange, setDateRange] = useState<DateRange | undefined>()
  const [isOpen, setIsOpen] = useState(false)

  useEffect(() => {
    onDateRangeChange(dateRange)
  }, [dateRange, onDateRangeChange])

  const clearDateRange = () => {
    setDateRange(undefined)
    setIsOpen(false)
  }

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className={cn(
              "w-[280px] justify-start text-left font-normal bg-[#1E1E1E] border-[#272727] hover:bg-[#272727] text-white",
              !dateRange && "text-white/60"
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {dateRange?.from ? (
              dateRange.to ? (
                <>
                  {format(dateRange.from, "dd/MM/yyyy", { locale: ptBR })} -{" "}
                  {format(dateRange.to, "dd/MM/yyyy", { locale: ptBR })}
                </>
              ) : (
                format(dateRange.from, "dd/MM/yyyy", { locale: ptBR })
              )
            ) : (
              "Selecione um período"
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0 bg-[#1E1E1E] border-[#272727]" align="start">
          <Calendar
            initialFocus
            mode="range"
            defaultMonth={dateRange?.from}
            selected={dateRange}
            onSelect={setDateRange}
            numberOfMonths={2}
            locale={ptBR}
            className="text-white"
          />
        </PopoverContent>
      </Popover>
      {dateRange && (
        <Button
          variant="ghost"
          size="icon"
          onClick={clearDateRange}
          className="h-8 w-8 text-white/70 hover:text-white hover:bg-[#272727]"
        >
          <X className="h-4 w-4" />
        </Button>
      )}
    </div>
  )
} 