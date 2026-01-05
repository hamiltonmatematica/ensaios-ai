"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase-client"
import LandingPage from "@/components/LandingPage"
import { Loader2 } from "lucide-react"

export default function Page() {
  const router = useRouter()
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null)
  const supabase = createClient()

  useEffect(() => {
    // Verificar se usuário está logado
    supabase.auth.getUser().then(({ data: { user }, error }) => {
      if (user && !error) {
        // Usuário logado - redirecionar para dashboard
        router.push("/dashboard")
      } else {
        // Não logado - mostrar landing page
        setIsAuthenticated(false)
      }
    })
  }, [router])

  // Mostrar loading enquanto verifica autenticação
  if (isAuthenticated === null) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-yellow-500" />
      </div>
    )
  }

  // Mostrar landing page para usuarios não autenticados
  return <LandingPage />
}
