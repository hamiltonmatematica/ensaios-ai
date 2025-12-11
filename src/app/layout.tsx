import { Providers } from "@/components/Providers"
import "./globals.css"
import type { Metadata } from "next"
import { Inter } from "next/font/google"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "Ensaios.AI - Estúdio de Ensaios Fotográficos com IA",
  description: "Transforme suas selfies em ensaios profissionais. Envie 3 fotos, escolha um estilo e a inteligência artificial faz o resto.",
  keywords: ["ensaio fotográfico", "fotos IA", "inteligência artificial", "fotos profissionais"],
  openGraph: {
    title: "Ensaios.AI - Estúdio de Ensaios Fotográficos com IA",
    description: "Transforme suas selfies em ensaios profissionais com IA",
    type: "website",
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="pt-BR">
      <body className={inter.className}>
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  )
}
