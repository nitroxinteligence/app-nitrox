import { MoreVertical } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

interface AgentCardProps {
  title: string
  description: string
  icon: React.ReactNode
  categories: string[]
  isNew?: boolean
}

export function AgentCard({ title, description, icon, categories, isNew }: AgentCardProps) {
  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
        <div className="flex gap-2 items-center">
          {icon}
          <CardTitle className="text-xl font-semibold">{title}</CardTitle>
        </div>
        <Button variant="ghost" size="icon">
          <MoreVertical className="h-4 w-4" />
        </Button>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap gap-2 mb-2">
          {isNew && (
            <Badge variant="secondary" className="bg-red-50 text-red-600 border-red-200">
              Novo!
            </Badge>
          )}
          {categories.map((category) => (
            <Badge key={category} variant="secondary" className="bg-purple-50 text-purple-600 border-purple-200">
              {category}
            </Badge>
          ))}
        </div>
        <p className="text-gray-500 text-sm">{description}</p>
      </CardContent>
    </Card>
  )
}

