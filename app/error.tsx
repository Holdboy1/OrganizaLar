"use client"

import { Button } from "@/components/ui/button"
import { AlertTriangle, RotateCcw, Home } from "lucide-react"

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-background">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="mx-auto h-16 w-16 rounded-full bg-destructive/10 flex items-center justify-center">
          <AlertTriangle className="h-8 w-8 text-destructive" />
        </div>
        <div>
          <h1 className="text-xl font-bold">Algo deu errado</h1>
          <p className="mt-2 text-sm text-muted-foreground break-words">
            {error?.message || "Não foi possível carregar esta tela."}
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 justify-center">
          <Button onClick={() => reset()} className="bg-emerald-500 hover:bg-emerald-600">
            <RotateCcw className="mr-2 h-4 w-4" />
            Tentar novamente
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              if (typeof window !== "undefined") {
                // Limpa storage suspeito e recarrega
                window.location.href = "/"
              }
            }}
          >
            <Home className="mr-2 h-4 w-4" />
            Voltar ao início
          </Button>
        </div>
        {error?.digest && (
          <p className="text-xs text-muted-foreground">Código: {error.digest}</p>
        )}
      </div>
    </div>
  )
}
