import { useRouter } from "next/navigation"
import { motion } from "framer-motion"
import { DynamicIcon } from "@/components/icons/dynamic-icon"

interface DashboardCardProps {
  title: string
  description: string
  iconName: string
  onClick: () => void
  isSelected: boolean
}

export function DashboardCard({ title, description, iconName, onClick, isSelected }: DashboardCardProps) {
  const router = useRouter()

  return (
    <motion.div
      onClick={onClick}
      className={`group relative h-auto w-full cursor-pointer overflow-hidden rounded-2xl transition-all duration-500 ease-in-out bg-zinc-900 p-6 ${
        isSelected ? "scale-95" : ""
      }`}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      transition={{ duration: 0.3 }}
      viewport={{ once: true }}
    >
      {/* Background layers */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-xl" />
      <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-transparent to-[#1C2618] opacity-30" />

      {/* Glass effect border */}
      <div className="absolute inset-0 rounded-[28px] border border-white/10 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.1)] bg-gradient-to-b from-white/5 to-transparent" />

      {/* Subtle top glow */}
      <div className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-transparent via-white/20 to-transparent" />

      {/* Content wrapper with standardized padding */}
      <div className="relative z-10 flex flex-col space-y-6">
        {/* Icon container with consistent size and spacing */}
        <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-zinc-800 transition-all duration-300 group-hover:bg-zinc-700">
          <DynamicIcon
            name={iconName as any}
            className="text-[#58E877] h-6 w-6 transition-all duration-300 group-hover:scale-110"
          />
        </div>

        {/* Text content with proper spacing */}
        <div className="space-y-2">
          <h3 className="text-xl font-semibold leading-tight tracking-tight text-white transition-all duration-300 group-hover:text-[#58E877]">
            {title}
          </h3>
          <p className="text-base font-normal leading-relaxed text-zinc-400 transition-all duration-300 group-hover:text-zinc-300 max-w-prose">
            {description}
          </p>
        </div>
      </div>

      {/* Hover gradient */}
      <div className="absolute inset-0 bg-gradient-to-tr from-[#4CFFA7]/0 via-transparent to-[#4CFFA7]/10 opacity-0 transition-opacity duration-500 ease-in-out group-hover:opacity-100" />
    </motion.div>
  )
}

