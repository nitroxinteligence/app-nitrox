import { motion } from "framer-motion"
import { DashboardSkeleton } from "@/components/ui/skeleton"

export function DashboardLoading() {
  return (
    <motion.div 
      className="w-full"
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
    >
      <DashboardSkeleton />
    </motion.div>
  )
}

export function MetricLoading() {
  return (
    <motion.div 
      className="w-full h-full min-h-[200px] bg-[#1E1E1E] rounded-lg p-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
    >
      <div className="h-4 w-1/3 bg-[#272727] rounded mb-4 animate-pulse" />
      <div className="h-24 w-full bg-[#272727] rounded mb-4 animate-pulse" />
      <div className="h-4 w-1/2 bg-[#272727] rounded animate-pulse" />
    </motion.div>
  )
} 