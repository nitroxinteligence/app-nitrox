export type QuestionType = "input" | "textarea" | "radio" | "text" | "section-header"

export interface FormStep {
  id: string
  type: QuestionType
  title?: string
  question: string
  description?: string
  placeholder?: string
  example?: string
  options?: string[]
  required?: boolean
  isSection?: boolean
}

export interface FormSection {
  title: string
  description: string
  steps: FormStep[]
}

export interface FormData {
  [key: string]: string
}

