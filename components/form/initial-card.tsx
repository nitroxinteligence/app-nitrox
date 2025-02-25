'use client'

import { motion } from 'framer-motion'
import { ArrowRight } from 'lucide-react'

interface InitialCardProps {
  onStart: () => void
}

export function InitialCard({ onStart }: InitialCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.3 }}
      className="bg-[#121214] rounded-xl border border-[#272727] overflow-hidden p-8 text-center"
    >
      <h2 className="text-2xl font-semibold text-[#58E877] mb-4">INFORMAÇÕES BÁSICAS DA EMPRESA</h2>
      <p className="text-gray-400 mb-8">Vamos começar conhecendo um pouco sobre sua empresa</p>
      <button
        onClick={onStart}
        className="relative inline-block p-px font-normal text-[1rem] leading-6 text-white bg-gray-800 shadow-2xl cursor-pointer rounded-xl shadow-zinc-900 transition-transform duration-300 ease-in-out hover:scale-105 active:scale-95 group"
      >
        <span
          className="absolute inset-0 rounded-xl bg-gradient-to-r from-[#58E877] to-[#E8F3ED] p-[2px] opacity-0 transition-opacity duration-500 group-hover:opacity-100"
        ></span>

        <span className="relative z-10 block px-5 py-2.5 rounded-xl bg-[#0B0B0B] border border-[#181818] text-sm">
          <div className="relative z-10 flex items-center space-x-2">
            <span className="transition-all duration-500 group-hover:translate-x-1 text-sm bg-gradient-to-r from-[#58E877] to-[#E8F3ED] bg-clip-text text-transparent">
              Estou pronto
            </span>
            <ArrowRight className="w-5 h-5 transition-transform duration-500 group-hover:translate-x-1">
              <svg width="0" height="0">
                <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop stopColor="#58E877" offset="0%" />
                  <stop stopColor="#E8F3ED" offset="100%" />
                </linearGradient>
              </svg>
              <path
                d="M5 12H19M19 12L12 5M19 12L12 19"
                stroke="url(#gradient)"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </ArrowRight>
          </div>
        </span>
      </button>
    </motion.div>
  )
}

