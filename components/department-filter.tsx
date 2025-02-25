"use client"

import type React from "react"
import { useRef, useState } from "react"
import { motion } from "framer-motion"

const cleanDepartmentName = (name: string) => {
  return name
    .replace(/Departamento\s*(de|do)?\s*/gi, "")
    .replace("Nível ", "")
    .trim()
}

interface DepartmentFilterProps {
  departments: string[]
  selectedDepartment: string | null
  onSelectDepartment: (department: string | null) => void
  disabledDepartments?: string[]
}

export function DepartmentFilter({
  departments,
  selectedDepartment,
  onSelectDepartment,
  disabledDepartments = [],
}: DepartmentFilterProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [startX, setStartX] = useState(0)
  const [scrollLeft, setScrollLeft] = useState(0)

  const smoothScroll = (target: number, duration: number) => {
    const container = scrollContainerRef.current
    if (!container) return

    const start = container.scrollLeft
    const distance = target - start
    let startTime: number | null = null

    const animation = (currentTime: number) => {
      if (startTime === null) startTime = currentTime
      const timeElapsed = currentTime - startTime
      const progress = Math.min(timeElapsed / duration, 1)

      const ease = (t: number) => (t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t)
      container.scrollLeft = start + distance * ease(progress)

      if (progress < 1) {
        requestAnimationFrame(animation)
      }
    }

    requestAnimationFrame(animation)
  }

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true)
    setStartX(e.pageX - (scrollContainerRef.current?.offsetLeft || 0))
    setScrollLeft(scrollContainerRef.current?.scrollLeft || 0)
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return
    e.preventDefault()

    const container = scrollContainerRef.current
    if (!container) return

    const x = e.pageX - container.offsetLeft
    const walk = (x - startX) * 1.5
    container.scrollLeft = scrollLeft - walk
  }

  const handleMouseUp = () => {
    setIsDragging(false)
  }

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault()
    const container = scrollContainerRef.current
    if (!container) return

    const scrollAmount = e.deltaY * 2
    smoothScroll(container.scrollLeft + scrollAmount, 300)
  }

  // Filter out duplicate departments and add "Todos"
  const uniqueDepartments = [...new Set(departments)]

  return (
    <div className="relative w-full">
      <div
        ref={scrollContainerRef}
        className="overflow-x-auto hide-scrollbar"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
        style={{
          overscrollBehavior: "none",
          scrollBehavior: "smooth",
        }}
      >
        <motion.div
          className="flex items-center gap-2 py-2 min-w-max"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
        >
          {uniqueDepartments.map((department) => (
            <FilterButton
              key={department}
              isActive={selectedDepartment === department}
              onClick={() => onSelectDepartment(department)}
              selectedDepartment={selectedDepartment}
              disabled={disabledDepartments.includes(department)}
            >
              {department}
            </FilterButton>
          ))}
        </motion.div>
      </div>

      <style jsx>{`
        .hide-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
        .hide-scrollbar::-webkit-scrollbar {
          display: none;
        }
      `}</style>
    </div>
  )
}

// Note: The "Custos" tab should be removed from the departments array in the parent component (app/perfil/page.tsx)
// Update the parent component to remove "Custos" from the tabs array
interface FilterButtonProps {
  isActive: boolean
  onClick: () => void
  children: React.ReactNode
  selectedDepartment: string | null
  disabled?: boolean
}

function FilterButton({ isActive, onClick, children, selectedDepartment, disabled }: FilterButtonProps) {
  const text = children === "Todos" ? "Todos" : cleanDepartmentName(children.toString())

  return (
    <motion.button
      onClick={onClick}
      className={`
        relative whitespace-nowrap px-5 h-9
        rounded-full text-sm font-medium tracking-wide
        transition-all duration-200 flex items-center justify-center
        ${isActive ? "text-white min-w-[100px]" : "text-[#E8F3ED]/60 hover:text-[#E8F3ED] min-w-[90px]"}
        ${disabled ? "opacity-50 cursor-not-allowed" : ""}
      `}
      whileHover={{ scale: disabled ? 1 : 1.02 }}
      whileTap={{ scale: disabled ? 1 : 0.98 }}
      disabled={disabled}
    >
      <span className="relative z-10">{text === "Configurações" ? "Custos" : text}</span>
      {isActive && (
        <motion.div
          className="absolute inset-0 rounded-full bg-[#121214]/80 border border-white/[0.05] backdrop-blur-xl shadow-lg"
          layoutId={selectedDepartment !== null ? "activeDepartment" : undefined}
          transition={{
            type: "spring",
            stiffness: 500,
            damping: 30,
          }}
        />
      )}
    </motion.button>
  )
}

