import type React from "react"
import type { Metadata } from "next"
import { GeistSans } from "geist/font/sans"
import { GeistMono } from "geist/font/mono"
import { Analytics } from "@vercel/analytics/next"
import { SuiWalletProvider } from "@/components/wallet-provider"
import { GlobalHeader } from "@/components/global-header"
import { Suspense } from "react"
import "./globals.css"

export const metadata: Metadata = {
  title: "SuiGameCenter - Blockchain Gaming Platform",
  description: "Premium gaming experience on SUI blockchain with multiplayer games and real-time synchronization",
  generator: "v0.app",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body className={`font-sans ${GeistSans.variable} ${GeistMono.variable}`}>
        <Suspense fallback={<div>Loading...</div>}>
          <SuiWalletProvider>
            <GlobalHeader />
            {children}
          </SuiWalletProvider>
        </Suspense>
        <Analytics />
      </body>
    </html>
  )
}
