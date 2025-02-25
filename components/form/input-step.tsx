'use client'

import { motion } from 'framer-motion'
import { Input } from '@/components/ui/input'

interface InputStepProps {
  placeholder: string
  value: string
  onChange: (value: string) => void
}

export function InputStep({ placeholder, value, onChange }: InputStepProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Input
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-[#1a1a1c] border-[#272727] text-white placeholder:text-gray-400 p-6 text-lg"
      />
    </motion.div>
  )
}

