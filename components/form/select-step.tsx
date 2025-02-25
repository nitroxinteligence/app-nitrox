"use client"

import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"

interface SelectStepProps {
  options: string[]
  value: string
  onChange: (value: string) => void
}

export function SelectStep({ options, value, onChange }: SelectStepProps) {
  return (
    <div className="space-y-2">
      {options.map((option, index) => (
        <motion.div
          key={option}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: index * 0.1 }}
        >
          <Button
            variant="outline"
            className={`w-full justify-start p-4 text-left transition-all ${
              value === option
                ? "bg-[#272727] border-[#F25E49] text-white"
                : "bg-[#1a1a1c] border-[#272727] text-gray-400 hover:text-white"
            }`}
            onClick={() => onChange(option)}
          >
            {option}
          </Button>
        </motion.div>
      ))}
    </div>
  )
}

