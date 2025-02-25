"use client"

import { motion } from "framer-motion"

interface SectionHeaderProps {
  title: string
  description: string
}

export function SectionHeader({ title, description }: SectionHeaderProps) {
  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-2 mb-8">
      <h2 className="text-lg font-semibold text-[#9BA3AF]">{title}</h2>
      <p className="text-gray-400">{description}</p>
    </motion.div>
  )
}

