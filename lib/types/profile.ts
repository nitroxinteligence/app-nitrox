export interface UserProfile {
  id: string
  name: string
  email: string
  avatar?: string
  language: string
}

export interface TeamMember {
  email: string
  role: "OWNER" | "ADMIN" | "MEMBER"
  status: "Ingressou" | "Pendente"
  joinedAt: string
}

export interface Team {
  id: string
  name: string
  members: TeamMember[]
  maxSeats: number
}

export interface Plan {
  name: string
  price: number
  credits: number
  features: string[]
  isPopular?: boolean
}

export interface Subscription {
  planId: string
  status: "active" | "canceled" | "past_due"
  currentPeriodEnd: string
  cancelAtPeriodEnd: boolean
}

