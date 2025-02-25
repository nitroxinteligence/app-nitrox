"use client"

import { useState, useRef, useEffect } from "react"
import { Paperclip, Image, Send, Mic, MicOff } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { motion } from "framer-motion"

interface ChatInputWithVoiceProps {
  onSend: (content: string, attachments: File[]) => Promise<void>
}

export function ChatInputWithVoice({ onSend }: ChatInputWithVoiceProps) {
  const [content, setContent] = useState("")
  const [attachments, setAttachments] = useState<File[]>([])
  const [isRecording, setIsRecording] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const recognitionRef = useRef<SpeechRecognition | null>(null)

  useEffect(() => {
    if (typeof window !== "undefined") {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
      if (SpeechRecognition) {
        recognitionRef.current = new SpeechRecognition()
        recognitionRef.current.continuous = true
        recognitionRef.current.interimResults = true
        recognitionRef.current.lang = "pt-BR"

        recognitionRef.current.onresult = (event) => {
          const transcript = Array.from(event.results)
            .map((result) => result[0])
            .map((result) => result.transcript)
            .join("")

          setContent(transcript)
        }

        recognitionRef.current.onerror = (event) => {
          console.error("Speech recognition error:", event.error)
          setIsRecording(false)
        }
      }
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop()
      }
    }
  }, [])

  const toggleRecording = () => {
    if (!recognitionRef.current) return

    if (isRecording) {
      recognitionRef.current.stop()
    } else {
      recognitionRef.current.start()
      setContent("")
    }
    setIsRecording(!isRecording)
  }

  const handleSubmit = async () => {
    if (content.trim() || attachments.length > 0) {
      await onSend(content.trim(), attachments)
      setContent("")
      setAttachments([])
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setAttachments(Array.from(e.target.files))
    }
  }

  return (
    <motion.div
      className="border-t border-[#1a1a1c] p-4 bg-[#0A0A0B] flex justify-center"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <div className="w-full max-w-4xl flex items-center space-x-2">
        <Input
          type="text"
          placeholder="Digite sua mensagem..."
          value={content}
          onChange={(e) => setContent(e.target.value)}
          className="flex-grow bg-[#1a1a1c] border-[#272727] text-white placeholder-gray-400 focus:ring-[#58E877] focus:border-[#58E877]"
          onKeyDown={handleKeyDown}
        />
        <div className="flex items-center space-x-2">
          <Button
            variant="ghost"
            size="icon"
            className="text-gray-400 hover:text-white hover:bg-[#1a1a1c]"
            onClick={() => fileInputRef.current?.click()}
          >
            <Paperclip className="h-5 w-5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="text-gray-400 hover:text-white hover:bg-[#1a1a1c]"
            onClick={() => {
              if (fileInputRef.current) {
                fileInputRef.current.accept = "image/*"
                fileInputRef.current.click()
              }
            }}
          >
            <Image className="h-5 w-5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className={`${
              isRecording ? "text-red-500 hover:text-red-600" : "text-gray-400 hover:text-white"
            } hover:bg-[#1a1a1c]`}
            onClick={toggleRecording}
          >
            {isRecording ? <MicOff className="h-5 w-5 animate-pulse" /> : <Mic className="h-5 w-5" />}
          </Button>
          <Button
            type="submit"
            size="icon"
            className="bg-[#58E877] hover:bg-[#4EDB82] text-[#0A0A0B]"
            onClick={handleSubmit}
          >
            <Send className="h-5 w-5" />
          </Button>
        </div>
      </div>
      <input
        type="file"
        ref={fileInputRef}
        className="hidden"
        onChange={handleFileChange}
        multiple
        accept="image/*,.pdf,.doc,.docx,.txt"
      />
    </motion.div>
  )
}

