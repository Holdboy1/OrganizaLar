"use client"

import {
  CreditCard,
  Settings,
  Download,
  Upload,
  HelpCircle,
  Info,
  Bell,
  Lock,
  Mic,
  ChevronRight,
} from "lucide-react"
import { cn } from "@/lib/utils"

interface MenuItemProps {
  icon: React.ReactNode
  label: string
  description?: string
  onClick?: () => void
  badge?: string
}

function MenuItem({ icon, label, description, onClick, badge }: MenuItemProps) {
  return (
    <button
      onClick={onClick}
      className="flex w-full items-center gap-3 rounded-xl border bg-card p-4 text-left shadow-card transition-all duration-200 hover:-translate-y-0.5 hover:shadow-card-hover"
    >
      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-medium">{label}</p>
        {description && (
          <p className="text-sm text-muted-foreground">{description}</p>
        )}
      </div>
      {badge && (
        <span className="rounded-full bg-primary px-2 py-0.5 text-xs font-medium text-white">
          {badge}
        </span>
      )}
      <ChevronRight className="h-5 w-5 text-muted-foreground" />
    </button>
  )
}

interface MaisProps {
  onNavigateToCartoes: () => void
}

export function Mais({ onNavigateToCartoes }: MaisProps) {
  return (
    <div className="space-y-6 pb-4 animate-fade-in">
      <h1 className="text-xl font-bold">Mais Opcoes</h1>

      {/* Primary Actions */}
      <section className="space-y-2">
        <MenuItem
          icon={<CreditCard className="h-5 w-5 text-secondary" />}
          label="Cartoes de Credito"
          description="Gerencie seus cartoes e faturas"
          onClick={onNavigateToCartoes}
        />
        <MenuItem
          icon={<Bell className="h-5 w-5 text-primary" />}
          label="Notificacoes"
          description="Configure lembretes e alertas"
          badge="3"
        />
        <MenuItem
          icon={<Mic className="h-5 w-5 text-primary" />}
          label="Assistente de Voz"
          description="Adicione despesas por voz"
        />
      </section>

      {/* Data Section */}
      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Dados
        </h2>
        <div className="space-y-2">
          <MenuItem
            icon={<Download className="h-5 w-5 text-muted-foreground" />}
            label="Backup"
            description="Salve seus dados na nuvem"
          />
          <MenuItem
            icon={<Upload className="h-5 w-5 text-muted-foreground" />}
            label="Restaurar Backup"
            description="Recupere dados salvos"
          />
        </div>
      </section>

      {/* Settings Section */}
      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Configuracoes
        </h2>
        <div className="space-y-2">
          <MenuItem
            icon={<Settings className="h-5 w-5 text-muted-foreground" />}
            label="Configuracoes"
            description="Personalize o app"
          />
          <MenuItem
            icon={<Lock className="h-5 w-5 text-muted-foreground" />}
            label="Seguranca"
            description="PIN e biometria"
          />
        </div>
      </section>

      {/* Help Section */}
      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Ajuda
        </h2>
        <div className="space-y-2">
          <MenuItem
            icon={<HelpCircle className="h-5 w-5 text-muted-foreground" />}
            label="Ajuda"
            description="Tutoriais e FAQ"
          />
          <MenuItem
            icon={<Info className="h-5 w-5 text-muted-foreground" />}
            label="Sobre"
            description="Versao 2.0.0"
          />
        </div>
      </section>
    </div>
  )
}
