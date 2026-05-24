"use client"

import { useRef, useState } from "react"
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
import { useAppStore } from "@/lib/store/app-store"
import { formatDataBR } from "@/lib/domain/helpers"

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
  const [painel, setPainel] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement | null>(null)
  const state = useAppStore()
  const exportarBackup = useAppStore(s => s.exportarBackup)
  const importarBackup = useAppStore(s => s.importarBackup)
  const registrarBackup = useAppStore(s => s.registrarBackup)

  const baixarBackup = () => {
    const blob = new Blob([exportarBackup()], { type: "application/json" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = `organizalar-backup-${new Date().toISOString().slice(0, 10)}.json`
    link.click()
    URL.revokeObjectURL(url)
    registrarBackup()
    setPainel("Backup salvo neste aparelho.")
  }

  const restaurarBackup = async (file: File | null) => {
    if (!file) return
    try {
      importarBackup(await file.text())
      setPainel("Backup restaurado com sucesso.")
    } catch {
      setPainel("Nao consegui restaurar esse arquivo. Ele nao parece ser um backup valido do OrganizaLar.")
    }
  }

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
          onClick={() => setPainel("Alertas ativos: backup, estoque baixo e gasto fora do normal.")}
        />
        <MenuItem
          icon={<Mic className="h-5 w-5 text-primary" />}
          label="Assistente de Voz"
          description="Adicione despesas por voz"
          onClick={() => setPainel("Use o botao de microfone no canto inferior para lancar compras, despesas e receitas por voz.")}
        />
      </section>

      {painel && (
        <section className="rounded-xl border bg-muted/40 p-4 text-sm text-muted-foreground">
          {painel}
        </section>
      )}

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
            onClick={baixarBackup}
          />
          <MenuItem
            icon={<Upload className="h-5 w-5 text-muted-foreground" />}
            label="Restaurar Backup"
            description="Recupere dados salvos"
            onClick={() => fileRef.current?.click()}
          />
          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            className="hidden"
            onChange={e => restaurarBackup(e.target.files?.[0] || null)}
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
            onClick={() => setPainel(`Dados locais: ${state.despesas.length} despesas, ${state.comprasMercado.length} compras de mercado, ${state.itensCatalogo.length} itens na despensa.`)}
          />
          <MenuItem
            icon={<Lock className="h-5 w-5 text-muted-foreground" />}
            label="Seguranca"
            description="PIN e biometria"
            onClick={() => setPainel("Seguranca local: seus dados ficam no aparelho. PIN/biometria entram como proxima melhoria nativa/PWA.")}
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
            onClick={() => setPainel("Fluxo recomendado: falar pelo microfone, revisar antes de salvar, e usar cupom fiscal para atualizar mercado e despensa.")}
          />
          <MenuItem
            icon={<Info className="h-5 w-5 text-muted-foreground" />}
            label="Sobre"
            description="Versao 2026.05.24.9"
            onClick={() => setPainel(`OrganizaLar PWA. Ultimo backup: ${state.ultimoBackup ? formatDataBR(state.ultimoBackup.slice(0, 10)) : "ainda nao registrado"}.`)}
          />
        </div>
      </section>
    </div>
  )
}
