import type { Notification, NotificationPreference } from "@/types/notifications"

export const mockNotifications: Notification[] = [
  {
    id: "1",
    type: "success",
    title: "Nova mensagem",
    message: "Você recebeu uma nova mensagem de João Silva.",
    timestamp: "Há 5 minutos",
  },
  {
    id: "2",
    type: "info",
    title: "Atualização do sistema",
    message: "Uma nova versão do sistema está disponível.",
    timestamp: "Há 1 hora",
  },
  {
    id: "3",
    type: "warning",
    title: "Espaço em disco baixo",
    message: "Seu espaço em disco está acabando. Libere espaço para evitar problemas.",
    timestamp: "Há 2 dias",
  },
]

export const defaultNotificationPreferences: NotificationPreference[] = [
  {
    id: "email",
    label: "Notificações por e-mail",
    enabled: true,
  },
  {
    id: "push",
    label: "Notificações push",
    enabled: false,
  },
]

