"use client"

import { motion } from "framer-motion"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"
import type { FormStep } from "@/types/form"

interface QuestionProps extends FormStep {
  value: string
  onChange: (value: string) => void
}

export function Question({ type, question, placeholder, example, options, value, onChange }: QuestionProps) {
  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
      <div className="space-y-2">
        <Label className="text-lg text-white">{question}</Label>
        {example && <p className="text-sm text-gray-400 italic">Exemplo: {example}</p>}
      </div>

      {type === "input" && (
        <Input
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="bg-[#1a1a1c] border-[#272727] text-white placeholder:text-gray-500"
        />
      )}

      {type === "textarea" && (
        <Textarea
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="bg-[#1a1a1c] border-[#272727] text-white placeholder:text-gray-500 min-h-[100px]"
        />
      )}

      {type === "radio" && options && (
        <RadioGroup value={value} onValueChange={onChange}>
          {options.map((option) => (
            <div key={option} className="flex items-center space-x-2">
              <RadioGroupItem value={option} id={option} />
              <Label htmlFor={option} className="text-white">
                {option}
              </Label>
            </div>
          ))}
        </RadioGroup>
      )}
    </motion.div>
  )
}

