"use client"

import { useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { DepartmentFilter } from "@/components/department-filter"
import Link from "next/link"
import { cn } from "@/lib/utils"
import { Play, Radio, HardDrive, Globe, Video, UserCircle, Share2, Mic, FileJson } from "lucide-react"
import { motion } from "framer-motion"

interface Tutorial {
  title: string
  description: string
  category: string
  icon: React.ElementType
  image: string
  color: string
  href: string
}

const tutorials: Tutorial[] = [
  {
    title: "Get started with transcoding",
    description:
      "Learn how to launch your first video transcoding job, transform your media files into different formats.",
    category: "Base de Conhecimento",
    icon: Play,
    image: "/placeholder.svg?height=200&width=400",
    color: "bg-blue-500",
    href: "/tutoriais/transcoding",
  },
  {
    title: "Learn all about live streaming",
    description: "Let's get started with live streaming, create and manage live streams and projects.",
    category: "Colaborador IA",
    icon: Radio,
    image: "/placeholder.svg?height=200&width=400",
    color: "bg-orange-500",
    href: "/tutoriais/live-streaming",
  },
  {
    title: "Explore media storage basics",
    description: "Store and manage media files via uploads and settings for permissions and global content delivery.",
    category: "Integraçoes",
    icon: HardDrive,
    image: "/placeholder.svg?height=200&width=400",
    color: "bg-green-500",
    href: "/tutoriais/media-storage",
  },
  {
    title: "Kickstart your content delivery",
    description: "Let's get started domain management signing keys management.",
    category: "Conversas",
    icon: Globe,
    image: "/placeholder.svg?height=200&width=400",
    color: "bg-purple-500",
    href: "/tutoriais/content-delivery",
  },
  {
    title: "Start your video player experience",
    description: "Let's started with video players and their API keys used for automation and billing.",
    category: "Dashboards",
    icon: Video,
    image: "/placeholder.svg?height=200&width=400",
    color: "bg-red-500",
    href: "/tutoriais/video-player",
  },
  {
    title: "Manage your account",
    description: "Update settings for your user account and other related connections.",
    category: "Configuraçoes",
    icon: UserCircle,
    image: "/placeholder.svg?height=200&width=400",
    color: "bg-blue-400",
    href: "/tutoriais/account",
  },
  {
    title: "Third-party integration",
    description: "Enhance your application's functionality seamlessly connecting with external services and tools.",
    category: "Base de Conhecimento",
    icon: Share2,
    image: "/placeholder.svg?height=200&width=400",
    color: "bg-teal-500",
    href: "/tutoriais/integration",
  },
  {
    title: "Create an audio file",
    description: "Easily record and save your voice or sounds into a high-quality audio file.",
    category: "Colaborador IA",
    icon: Mic,
    image: "/placeholder.svg?height=200&width=400",
    color: "bg-pink-500",
    href: "/tutoriais/audio",
  },
  {
    title: "Retrieving video metadata",
    description: "Access essential information about your videos, including title, duration, resolution etc.",
    category: "Integraçoes",
    icon: FileJson,
    image: "/placeholder.svg?height=200&width=400",
    color: "bg-yellow-500",
    href: "/tutoriais/metadata",
  },
]

const categories = ["Base de Conhecimento", "Colaborador IA", "Integraçoes", "Conversas", "Dashboards", "Configuraçoes"]

const containerVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5 } },
}

export default function TutoriaisPage() {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)

  const filteredTutorials = selectedCategory
    ? tutorials.filter((tutorial) => tutorial.category === selectedCategory)
    : tutorials

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={containerVariants}
      className="relative min-h-screen w-full"
    >
      <div className="relative min-h-screen w-full">
        {/* Background Gradient Orbs */}

        <div className="mx-auto max-w-7xl px-4 pt-0 pb-0">
          <div className="relative rounded-2xl bg-black/40 backdrop-blur-xl">
            <div className="space-y-12 p-8">
              {/* Header Section */}
              <div className="space-y-4">
                <div className="text-4xl font-regular bg-gradient-to-r from-[#58E877] to-[#E8F3ED] bg-clip-text text-transparent">
                  Tutoriais
                </div>
                <div className="text-[#E8F3ED]/60 text-lg max-w-3xl">
                  Aprenda como utilizar a plataforma Brazil Flow.
                </div>
              </div>

              <DepartmentFilter
                departments={categories}
                selectedDepartment={selectedCategory}
                onSelectDepartment={setSelectedCategory}
              />

              {/* Tutorials Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredTutorials.map((tutorial) => (
                  <div key={tutorial.title} className="group">
                    <Link href={tutorial.href}>
                      <Card className="relative overflow-hidden bg-[#121214] border-white/[0.05] hover:border-[#58E877]/20 transition-all duration-300">
                        {/* Colored Border Top - Change to match card background */}
                        <div className={cn("absolute top-0 left-0 right-0 h-1 bg-[#121214]")} />

                        {/* Preview Image */}
                        <div className="relative aspect-[2/1] overflow-hidden">
                          <img
                            src={tutorial.image || "/placeholder.svg"}
                            alt={tutorial.title}
                            className="object-cover w-full h-full transition-transform duration-300 group-hover:scale-105 group-hover:opacity-75"
                          />
                          <div className="absolute inset-0 flex items-center justify-center">
                            <div className="w-16 h-16 rounded-full bg-gradient-to-r from-[#58E877] to-[#E8F3ED] flex items-center justify-center cursor-pointer transition-transform duration-300 hover:scale-110">
                              <svg
                                xmlns="http://www.w3.org/2000/svg"
                                viewBox="0 0 24 24"
                                fill="currentColor"
                                className="w-8 h-8 text-black"
                              >
                                <path
                                  fillRule="evenodd"
                                  d="M4.5 5.653c0-1.426 1.529-2.33 2.779-1.643l11.54 6.348c1.295.712 1.295 2.573 0 3.285L7.28 19.991c-1.25.687-2.779-.217-2.779-1.643V5.653z"
                                  clipRule="evenodd"
                                />
                              </svg>
                            </div>
                          </div>
                        </div>

                        {/* Content */}
                        <CardContent className="p-6 space-y-4">
                          <h3 className="text-xl font-semibold text-white group-hover:text-[#58E877] transition-colors">
                            {tutorial.title}
                          </h3>
                          <p className="text-[#E8F3ED]/60 text-sm">{tutorial.description}</p>

                          {/* Category Tag */}
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-medium text-gray-300">{tutorial.category}</span>
                          </div>
                        </CardContent>
                      </Card>
                    </Link>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  )
}

