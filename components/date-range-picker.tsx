"use client"

import { useState, useEffect } from "react"
import { format, addMonths, subMonths, startOfMonth, endOfMonth, isToday, isWithinInterval, isSameDay } from "date-fns"
import { ptBR } from "date-fns/locale"
import { motion, AnimatePresence } from "framer-motion"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { cn } from "@/lib/utils"

interface DateRange {
  from: Date | null
  to: Date | null
}

interface DateRangePickerProps {
  onDateRangeChange: (range: DateRange) => void
  isOpen: boolean
  onClose: () => void
}

const quickSelectOptions = [
  { label: "Hoje", getValue: () => ({ from: new Date(), to: new Date() }) },
  {
    label: "Ontem",
    getValue: () => {
      const yesterday = new Date()
      yesterday.setDate(yesterday.getDate() - 1)
      return { from: yesterday, to: yesterday }
    },
  },
  {
    label: "Últimos 7 Dias",
    getValue: () => {
      const to = new Date()
      const from = new Date()
      from.setDate(from.getDate() - 7)
      return { from, to }
    },
  },
  {
    label: "Últimos 30 Dias",
    getValue: () => {
      const to = new Date()
      const from = new Date()
      from.setDate(from.getDate() - 30)
      return { from, to }
    },
  },
  {
    label: "Este Mês",
    getValue: () => ({
      from: startOfMonth(new Date()),
      to: new Date(),
    }),
  },
  {
    label: "Mês Passado",
    getValue: () => {
      const today = new Date()
      const firstDayLastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1)
      const lastDayLastMonth = endOfMonth(firstDayLastMonth)
      return { from: firstDayLastMonth, to: lastDayLastMonth }
    },
  },
  { label: "Personalizado", getValue: () => ({ from: null, to: null }) },
]

export function DateRangePicker({ onDateRangeChange, isOpen, onClose }: DateRangePickerProps) {
  const [selectedRange, setSelectedRange] = useState<DateRange>({ from: null, to: null })
  const [hoveredDate, setHoveredDate] = useState<Date | null>(null)
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [selectedQuickOption, setSelectedQuickOption] = useState<string | null>(null)

  const nextMonth = addMonths(currentMonth, 1)

  const handleDateSelect = (date: Date) => {
    if (!selectedRange.from || (selectedRange.from && selectedRange.to)) {
      // Start new selection
      setSelectedRange({ from: date, to: null })
      setSelectedQuickOption(null)
    } else {
      // Complete selection
      const range = {
        from: selectedRange.from,
        to: date,
      }
      if (range.from > range.to) {
        // Swap dates if selected in reverse
        const temp = range.from
        range.to = temp
        range.from = temp
      }
      setSelectedRange(range)
      onDateRangeChange(range)
      onClose()
    }
  }

  const handleQuickSelect = (option: (typeof quickSelectOptions)[0]) => {
    const range = option.getValue()
    setSelectedRange(range)
    setSelectedQuickOption(option.label)

    // Immediately update metrics if it's not the "Personalizado" option
    if (option.label !== "Personalizado" && range.from && range.to) {
      onDateRangeChange(range)
      onClose()
    }
  }

  const isDateInRange = (date: Date) => {
    if (selectedRange.from && selectedRange.to) {
      return isWithinInterval(date, { start: selectedRange.from, end: selectedRange.to })
    }
    if (selectedRange.from && hoveredDate) {
      const start = selectedRange.from < hoveredDate ? selectedRange.from : hoveredDate
      const end = selectedRange.from < hoveredDate ? hoveredDate : selectedRange.from
      return isWithinInterval(date, { start, end })
    }
    return false
  }

  const isDateSelected = (date: Date) =>
    (selectedRange.from && isSameDay(date, selectedRange.from)) ||
    (selectedRange.to && isSameDay(date, selectedRange.to))

  const renderCalendar = (month: Date) => {
    const start = startOfMonth(month)
    const days = []
    for (let i = 0; i < 42; i++) {
      const date = new Date(start)
      date.setDate(date.getDate() + i)
      days.push(date)
    }

    return (
      <div className="space-y-4">
        <div className="grid grid-cols-7 gap-1 text-sm">
          {["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"].map((day) => (
            <div key={day} className="text-white/70 py-2 px-3 tracking-wider font-medium">
              {day}
            </div>
          ))}
          {days.map((date, i) => {
            const isCurrentMonth = date.getMonth() === month.getMonth()
            const isSelected = isDateSelected(date)
            const isInRange = isDateInRange(date)

            return (
              <button
                key={i}
                onClick={() => handleDateSelect(date)}
                onMouseEnter={() => setHoveredDate(date)}
                onMouseLeave={() => setHoveredDate(null)}
                disabled={!isCurrentMonth}
                className={cn(
                  "h-7 w-7 rounded-full text-sm relative",
                  "hover:bg-[#58E877] hover:text-black transition-colors",
                  "disabled:opacity-50 disabled:cursor-not-allowed",
                  isCurrentMonth ? "text-white" : "text-gray-500",
                  isSelected && "bg-[#58E877] text-black",
                  isInRange && !isSelected && "bg-[#58E877]/20 text-white",
                  isToday(date) && !isSelected && "border border-[#58E877]",
                )}
              >
                {format(date, "d")}
              </button>
            )
          })}
        </div>
      </div>
    )
  }

  useEffect(() => {
    if (!isOpen) return

    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      if (!target.closest(".date-range-picker-content")) {
        onClose()
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [isOpen, onClose])

  if (!isOpen) return null

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-start justify-center pt-20">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ duration: 0.2 }}
          className="relative"
        >
          <Card className="p-6 bg-[#0F0F10] border-[#1B1B1D] shadow-xl w-[680px] date-range-picker-content">
            <div className="flex gap-6">
              {/* Quick select options */}
              <div className="w-40 space-y-1 border-r border-[#1B1B1D] pr-3">
                {quickSelectOptions.map((option) => (
                  <button
                    key={option.label}
                    onClick={() => handleQuickSelect(option)}
                    className={cn(
                      "w-full px-3 py-2 text-left text-sm rounded-lg transition-colors",
                      selectedQuickOption === option.label
                        ? "bg-[#58E877] text-black"
                        : "text-white hover:bg-[#58E877]/20",
                    )}
                  >
                    {option.label}
                  </button>
                ))}
              </div>

              {/* Calendar */}
              <div className="flex-1">
                <div className="flex items-center justify-between mb-6">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
                    className="text-white hover:text-black hover:bg-[#58E877]"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <div className="grid grid-cols-2 gap-16">
                    <h2 className="font-medium text-white">{format(currentMonth, "MMMM yyyy", { locale: ptBR })}</h2>
                    <h2 className="font-medium text-white">{format(nextMonth, "MMMM yyyy", { locale: ptBR })}</h2>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
                    className="text-white hover:text-black hover:bg-[#58E877]"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
                <div className="grid grid-cols-2 gap-12">
                  {renderCalendar(currentMonth)}
                  {renderCalendar(nextMonth)}
                </div>
              </div>
            </div>
          </Card>

          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 -z-10"
          />
        </motion.div>
      </div>
    </AnimatePresence>
  )
}

