"use client"

import { useWallet } from "@suiet/wallet-kit"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Wallet, LogOut, CheckCircle, AlertCircle } from "lucide-react"
import { useEffect, useState } from "react"

const WALLET_LOGOS: Record<string, string> = {
  Slush: "https://slush.app/favicon.ico",
  "Sui Wallet": "https://slush.app/favicon.ico", // Legacy name fallback
  Suiet: "https://suiet.app/favicon.ico",
  "Martian Wallet": "https://martianwallet.xyz/favicon.ico",
  "Ethos Wallet": "https://ethoswallet.xyz/favicon.ico",
  "Nightly Wallet": "https://nightly.app/favicon.ico",
  "Glass Wallet": "https://glasswallet.io/favicon.ico",
  "Surf Wallet": "https://surf.tech/favicon.ico",
}

const MAIN_WALLETS = ["Slush", "Sui Wallet", "Suiet", "Martian Wallet", "Ethos Wallet"]

export function WalletConnect() {
  const { connected, connecting, disconnect, select, configuredWallets, account } = useWallet()
  const [isDetecting, setIsDetecting] = useState(true)

  const displayWallets =
    configuredWallets?.filter(
      (wallet) => wallet.installed || (MAIN_WALLETS.includes(wallet.name) && wallet.installed),
    ) || []

  useEffect(() => {
    if (configuredWallets && configuredWallets.length > 0) {
      console.log(
        "[v0] Available wallets:",
        configuredWallets.map((w) => ({
          name: w.name,
          installed: w.installed,
          icon: (w as any).icon,
          iconUrl: (w as any).iconUrl,
          logo: (w as any).logo,
        })),
      )
    }
  }, [configuredWallets])

  useEffect(() => {
    const detectWallets = async () => {
      // Give time for wallets to load
      await new Promise((resolve) => setTimeout(resolve, 1000))
      setIsDetecting(false)
    }

    detectWallets()
  }, [displayWallets])

  const getWalletLogo = (wallet: any) => {
    // Try to get icon from wallet object first
    if (wallet.icon) return wallet.icon
    if (wallet.iconUrl) return wallet.iconUrl
    if (wallet.logo) return wallet.logo

    // Fallback to our predefined logos
    return WALLET_LOGOS[wallet.name] || "https://sui.io/favicon.ico"
  }

  console.log("[v0] Wallet state:", {
    connected,
    connecting,
    configuredWallets: configuredWallets?.length,
    displayWallets: displayWallets?.length,
    account: account?.address,
  })

  if (connected && account) {
    return (
      <Card className="w-full max-w-md border-green-200 bg-green-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-green-800">
            <CheckCircle className="h-5 w-5" />
            Wallet Connected
          </CardTitle>
          <CardDescription className="text-green-700">
            <span className="font-mono text-sm">
              {account.address.slice(0, 8)}...{account.address.slice(-6)}
            </span>
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            onClick={disconnect}
            variant="outline"
            className="w-full border-green-300 hover:bg-green-100 bg-transparent"
          >
            <LogOut className="h-4 w-4 mr-2" />
            Disconnect Wallet
          </Button>
        </CardContent>
      </Card>
    )
  }

  if (isDetecting) {
    return (
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wallet className="h-5 w-5 animate-pulse" />
            Detecting Wallets...
          </CardTitle>
          <CardDescription>Searching for installed SUI wallets</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!displayWallets || displayWallets.length === 0) {
    return (
      <Card className="w-full max-w-md border-orange-200 bg-orange-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-orange-800">
            <AlertCircle className="h-5 w-5" />
            No SUI Wallets Installed
          </CardTitle>
          <CardDescription className="text-orange-700">
            Install a SUI wallet extension to connect and play
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="text-sm text-orange-600 mb-3">
              <strong>Install one of these wallets:</strong>
            </div>
            <Button
              onClick={() =>
                window.open(
                  "https://chromewebstore.google.com/detail/slush-sui-wallet/fbmblbjkdjcnkpkfkejkmhpnkfkbdkbp",
                  "_blank",
                )
              }
              variant="outline"
              className="w-full border-orange-300 hover:bg-orange-100 flex items-center gap-3"
            >
              <img
                src="https://slush.app/favicon.ico"
                alt="Slush Wallet"
                className="h-5 w-5 rounded"
                onError={(e) => {
                  ;(e.target as HTMLImageElement).src = "https://sui.io/favicon.ico"
                }}
              />
              Install Slush Wallet
            </Button>
            <Button
              onClick={() => window.open("https://suiet.app/", "_blank")}
              variant="outline"
              className="w-full border-orange-300 hover:bg-orange-100 flex items-center gap-3"
            >
              <img
                src="https://suiet.app/favicon.ico"
                alt="Suiet"
                className="h-5 w-5 rounded"
                onError={(e) => {
                  ;(e.target as HTMLImageElement).src = "https://sui.io/favicon.ico"
                }}
              />
              Install Suiet Wallet
            </Button>
            <Button
              onClick={() => window.open("https://martianwallet.xyz/", "_blank")}
              variant="outline"
              className="w-full border-orange-300 hover:bg-orange-100 flex items-center gap-3"
            >
              <img
                src="https://martianwallet.xyz/favicon.ico"
                alt="Martian Wallet"
                className="h-5 w-5 rounded"
                onError={(e) => {
                  ;(e.target as HTMLImageElement).src = "https://sui.io/favicon.ico"
                }}
              />
              Install Martian Wallet
            </Button>
            <Button
              onClick={() => window.open("https://ethoswallet.xyz/", "_blank")}
              variant="outline"
              className="w-full border-orange-300 hover:bg-orange-100 flex items-center gap-3"
            >
              <img
                src="https://ethoswallet.xyz/favicon.ico"
                alt="Ethos Wallet"
                className="h-5 w-5 rounded"
                onError={(e) => {
                  ;(e.target as HTMLImageElement).src = "https://sui.io/favicon.ico"
                }}
              />
              Install Ethos Wallet
            </Button>
            <div className="text-xs text-orange-600 mt-3 text-center">After installation, refresh this page</div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="w-full max-w-md border-blue-200 bg-blue-50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-blue-800">
          <Wallet className="h-5 w-5" />
          Connect SUI Wallet
        </CardTitle>
        <CardDescription className="text-blue-700">
          {displayWallets.length} installed wallet{displayWallets.length > 1 ? "s" : ""} found
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        {displayWallets.map((wallet) => (
          <Button
            key={wallet.name}
            onClick={() => {
              console.log("[v0] Attempting to connect to wallet:", wallet.name)
              select(wallet.name)
            }}
            disabled={connecting}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-3"
            variant="default"
          >
            {connecting ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                Connecting...
              </>
            ) : (
              <>
                <img
                  src={getWalletLogo(wallet) || "/placeholder.svg"}
                  alt={wallet.name}
                  className="h-5 w-5 rounded"
                  onError={(e) => {
                    ;(e.target as HTMLImageElement).src = "https://sui.io/favicon.ico"
                  }}
                />
                Connect {wallet.name}
              </>
            )}
          </Button>
        ))}
        <div className="text-xs text-blue-600 mt-3 text-center">Your wallet will open to approve the connection</div>
      </CardContent>
    </Card>
  )
}
