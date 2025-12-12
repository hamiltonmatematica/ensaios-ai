import { Providers } from "@/components/Providers"
import "./globals.css"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import Script from "next/script"

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
      <head>
        {/* Meta Pixel 1 */}
        <Script id="meta-pixel-1" strategy="afterInteractive">
          {`
            !function(f,b,e,v,n,t,s)
            {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
            n.callMethod.apply(n,arguments):n.queue.push(arguments)};
            if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
            n.queue=[];t=b.createElement(e);t.async=!0;
            t.src=v;s=b.getElementsByTagName(e)[0];
            s.parentNode.insertBefore(t,s)}(window, document,'script',
            'https://connect.facebook.net/en_US/fbevents.js');
            fbq('init', '820138179681824');
            fbq('track', 'PageView');
          `}
        </Script>
        {/* Meta Pixel 2 */}
        <Script id="meta-pixel-2" strategy="afterInteractive">
          {`
            fbq('init', '25727176796888828');
            fbq('track', 'PageView');
          `}
        </Script>
        <noscript>
          <img
            height="1"
            width="1"
            style={{ display: 'none' }}
            src="https://www.facebook.com/tr?id=820138179681824&ev=PageView&noscript=1"
            alt=""
          />
          <img
            height="1"
            width="1"
            style={{ display: 'none' }}
            src="https://www.facebook.com/tr?id=25727176796888828&ev=PageView&noscript=1"
            alt=""
          />
        </noscript>
      </head>
      <body className={inter.className}>
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  )
}
