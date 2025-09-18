"use client"

import { useWallet } from "@suiet/wallet-kit"
import { Button } from "@/components/ui/button"
import { LogOut, Gamepad2, Sparkles, Gem } from "lucide-react" // Added Gem icon for NFT button
import { mintOGNFT } from "@/lib/sui-contract"

export function GlobalHeader() {
  const { connected, account, disconnect, signAndExecuteTransaction } = useWallet()

  if (!connected || !account) {
    return null
  }

  const handleDisconnect = async () => {
    try {
      await disconnect()
    } catch (error) {
      console.error("Failed to disconnect wallet:", error)
    }
  }

  const handleMintNFT = async () => {
    try {
      console.log("Minting OG NFT for:", account.address)
      
      if (!signAndExecuteTransaction) {
        console.error("Wallet signing function not available")
        return
      }

      const result = await mintOGNFT(account.address, signAndExecuteTransaction)
      
      if (result.success) {
        console.log("OG NFT minted successfully! Transaction digest:", result.digest)
        // You could add a toast notification here for user feedback
      } else {
        console.error("Failed to mint OG NFT:", result.error)
        // You could add a toast error notification here
      }
    } catch (error) {
      console.error("Failed to mint NFT:", error)
    }
  }

  const truncateAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`
  }

  return (
    <header
      className={`sticky top-0 z-50 w-full border-b border-primary/10 bg-background/80 backdrop-blur-xl supports-[backdrop-filter]:bg-background/60 transition-all duration-300 ${
        connected ? "translate-y-0 opacity-100" : "-translate-y-full opacity-0"
      }`}
    >
      <div className="container flex h-16 items-center justify-between px-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-xl">
            <Gamepad2 className="h-6 w-6 text-primary" />
          </div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              SuiGameCenter
            </h1>
            <Sparkles className="h-4 w-4 text-accent animate-pulse" />
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-3 px-4 py-2 bg-accent/10 rounded-xl border border-accent/20">
            <div className="h-2 w-2 rounded-full bg-accent animate-pulse" />
            <span className="font-mono text-sm text-accent font-medium">{truncateAddress(account.address)}</span>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={handleMintNFT}
            className="gap-2 glass-card hover:bg-primary/10 hover:text-primary hover:border-primary/20 transition-all duration-300 bg-transparent"
          >
            <Gem className="h-4 w-4" />
            Mint OG NFT
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handleDisconnect}
            className="gap-2 glass-card hover:bg-destructive/10 hover:text-destructive hover:border-destructive/20 transition-all duration-300 bg-transparent"
          >
            <LogOut className="h-4 w-4" />
            Disconnect
          </Button>
        </div>
      </div>
    </header>
  )
}
