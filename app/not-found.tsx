import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Home } from "lucide-react"

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-background">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="text-6xl">🤔</div>
        <div>
          <h1 className="text-2xl font-bold">Página não encontrada</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Esta página não existe ou foi movida.
          </p>
        </div>
        <Link href="/">
          <Button className="bg-emerald-500 hover:bg-emerald-600">
            <Home className="mr-2 h-4 w-4" />
            Voltar ao início
          </Button>
        </Link>
      </div>
    </div>
  )
}
