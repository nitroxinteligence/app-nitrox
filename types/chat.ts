export interface Message {
  id?: string
  role: "user" | "system" | "assistant"
  content: string
  session_id: string
  created_at: string
  updated_at?: string
  attachments?: {
    id?: string
    file_url: string
    file_name: string
    file_type: string
    file_size: number
  }[]
}

export interface Attachment {
  id?: string
  message_id: string
  file_url: string
  file_name: string
  file_type: string
  file_size: number
  extracted_text?: string
  created_at?: string
  updated_at?: string
}

export type FileType = "pdf" | "doc" | "docx" | "xls" | "xlsx" | "txt" | "png" | "jpg" | "jpeg"

export const ALLOWED_FILE_TYPES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "text/plain",
  "image/png",
  "image/jpeg"
]

export const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB 