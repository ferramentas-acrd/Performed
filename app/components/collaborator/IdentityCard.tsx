import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'

interface Props {
  fullName: string | null
  email: string | null
  isActive: boolean
  lastImport: string | null
}

export function IdentityCard({ fullName, email, isActive, lastImport }: Props) {
  const initials = (fullName ?? '??').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
  return (
    <Card>
      <CardContent className="flex items-center gap-4 py-4">
        <Avatar className="h-12 w-12">
          <AvatarFallback className="text-lg">{initials}</AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-lg truncate">{fullName ?? 'Conta desconhecida'}</span>
            <Badge variant={isActive ? 'default' : 'secondary'}>{isActive ? 'Ativo' : 'Inativo'}</Badge>
          </div>
          {email && <p className="text-sm text-muted-foreground">{email}</p>}
        </div>
        {lastImport && (
          <p className="text-xs text-muted-foreground hidden sm:block">
            Dados de {new Date(lastImport).toLocaleDateString('pt-BR')}
          </p>
        )}
      </CardContent>
    </Card>
  )
}
