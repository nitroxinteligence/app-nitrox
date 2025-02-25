export interface Notification {
  id: string
  type: "error" | "warning" | "success" | "info"
  title: string
  message: string
  timestamp: string
}

export interface NotificationPreference {
  id: string
  label: string
  enabled: boolean
}

