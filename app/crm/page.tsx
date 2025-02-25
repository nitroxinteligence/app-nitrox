"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Users, Phone, Mail, Calendar } from "lucide-react"

export default function CRMPage() {
  const [selectedView, setSelectedView] = useState<string>("contacts")

  const views = [
    { name: "Contacts", icon: Users },
    { name: "Calls", icon: Phone },
    { name: "Emails", icon: Mail },
    { name: "Appointments", icon: Calendar },
  ]

  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-[#0A0A0B]">
      <div className="mx-auto max-w-7xl px-4 py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="space-y-8"
        >
          <div>
            <h1 className="text-4xl font-semibold text-white">CRM Dashboard</h1>
            <p className="text-[#E8F3ED]/60 mt-2">Manage your customer relationships efficiently</p>
          </div>

          <div className="flex space-x-4">
            {views.map((view) => (
              <Button
                key={view.name}
                onClick={() => setSelectedView(view.name.toLowerCase())}
                variant={selectedView === view.name.toLowerCase() ? "default" : "outline"}
                className="flex items-center space-x-2"
              >
                <view.icon className="h-4 w-4" />
                <span>{view.name}</span>
              </Button>
            ))}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <Card className="bg-[#121214]/80 border-white/[0.05]">
              <CardHeader>
                <CardTitle className="text-white">Total Contacts</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold text-[#58E877]">1,234</p>
              </CardContent>
            </Card>
            <Card className="bg-[#121214]/80 border-white/[0.05]">
              <CardHeader>
                <CardTitle className="text-white">Open Deals</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold text-[#58E877]">42</p>
              </CardContent>
            </Card>
            <Card className="bg-[#121214]/80 border-white/[0.05]">
              <CardHeader>
                <CardTitle className="text-white">Upcoming Calls</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold text-[#58E877]">7</p>
              </CardContent>
            </Card>
          </div>

          {/* Placeholder for view-specific content */}
          <Card className="bg-[#121214]/80 border-white/[0.05]">
            <CardHeader>
              <CardTitle className="text-white capitalize">{selectedView} View</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-[#E8F3ED]/60">Content for {selectedView} view goes here.</p>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  )
}

