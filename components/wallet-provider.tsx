"use client"

import type React from "react"
import { WalletProvider } from "@suiet/wallet-kit"
import { SuiDevnetChain, SuiTestnetChain, SuiMainnetChain } from "@suiet/wallet-kit"

const supportedChains = [SuiDevnetChain, SuiTestnetChain, SuiMainnetChain]

export function SuiWalletProvider({ children }: { children: React.ReactNode }) {
  return (
    <WalletProvider chains={supportedChains} autoConnect={true}>
      {children}
    </WalletProvider>
  )
}
