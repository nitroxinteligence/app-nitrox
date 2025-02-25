import {
  CircleIcon,
  BrainCircuitIcon,
  MessagesSquareIcon,
  BarChartIcon,
  UserIcon,
  ShoppingCartIcon,
  HeartHandshakeIcon,
  LightbulbIcon,
  GlobeIcon,
  UsersIcon,
  SearchIcon,
  FacebookIcon,
} from "lucide-react"

const iconMap = {
  circle: CircleIcon,
  brain: BrainCircuitIcon,
  messages: MessagesSquareIcon,
  chart: BarChartIcon,
  user: UserIcon,
  cart: ShoppingCartIcon,
  handshake: HeartHandshakeIcon,
  lightbulb: LightbulbIcon,
  globe: GlobeIcon,
  users: UsersIcon,
  search: SearchIcon,
  facebook: FacebookIcon,
}

type IconName = keyof typeof iconMap

interface DynamicIconProps {
  name: IconName
  className?: string
}

export function DynamicIcon({ name, className = "" }: DynamicIconProps) {
  const IconComponent = iconMap[name] || CircleIcon
  return <IconComponent className={className} />
}

