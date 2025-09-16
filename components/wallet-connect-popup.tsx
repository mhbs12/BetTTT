"use client"

import { useState, useEffect } from "react"
import { useWallet } from "@suiet/wallet-kit"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { AlertCircle, ExternalLink } from "lucide-react"

interface WalletConnectPopupProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function WalletConnectPopup({ open, onOpenChange }: WalletConnectPopupProps) {
  const { configuredWallets, select, connecting } = useWallet()
  const [availableWallets, setAvailableWallets] = useState<any[]>([])

  useEffect(() => {
    if (configuredWallets) {
      console.log("[v0] Available wallets:", configuredWallets)
      const installedWallets = configuredWallets.filter((wallet) => wallet.installed)
      const displayWallets = installedWallets.length > 0 ? installedWallets : configuredWallets.slice(0, 4)
      setAvailableWallets(displayWallets)
    }
  }, [configuredWallets])

  const handleConnect = async (wallet: any) => {
    try {
      console.log("[v0] Connecting to wallet:", wallet)
      await select(wallet.name)
      onOpenChange(false) // Close popup on successful connection
    } catch (error) {
      console.error("[v0] Failed to connect:", error)
    }
  }

  const getInstallUrl = (walletName: string) => {
    const urls: Record<string, string> = {
      Slush: "https://chromewebstore.google.com/detail/slush/nbdhibgjnjpnkajaghbffjbkcgljbgkp",
      "Sui Wallet": "https://chromewebstore.google.com/detail/slush/nbdhibgjnjpnkajaghbffjbkcgljbgkp",
      Suiet: "https://chromewebstore.google.com/detail/suiet-sui-wallet/khpkpbbcccdmmclmpigdgddabeilkdpd",
      "Martian Wallet":
        "https://chromewebstore.google.com/detail/martian-aptos-wallet/efbglgofoippbgcjepnhiblaibcnclgk",
      "Ethos Wallet": "https://chromewebstore.google.com/detail/ethos-sui-wallet/mcbigmjiafegjnnogedioegffbooigli",
    }
    return urls[walletName] || "https://chrome.google.com/webstore"
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Connect Wallet</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {availableWallets.length > 0 ? (
            <>
              <div className="space-y-2">
                {availableWallets.map((wallet) => (
                  <div key={wallet.name} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full overflow-hidden flex items-center justify-center bg-gray-100">
                        {wallet.iconUrl ? (
                          <img
                            src={wallet.iconUrl || "/placeholder.svg"}
                            alt={wallet.label || wallet.name}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              // Fallback to letter if image fails
                              const target = e.target as HTMLImageElement
                              target.style.display = "none"
                              target.nextElementSibling!.classList.remove("hidden")
                            }}
                          />
                        ) : null}
                        <span className={`text-gray-600 text-xs font-bold ${wallet.iconUrl ? "hidden" : ""}`}>
                          {(wallet.label || wallet.name).charAt(0)}
                        </span>
                      </div>
                      <div>
                        <p className="font-medium">{wallet.label || wallet.name}</p>
                        {wallet.installed && (
                          <Badge variant="secondary" className="text-xs">
                            Installed
                          </Badge>
                        )}
                      </div>
                    </div>

                    {wallet.installed ? (
                      <Button onClick={() => handleConnect(wallet)} disabled={connecting} size="sm">
                        {connecting ? "Connecting..." : "Connect"}
                      </Button>
                    ) : (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => window.open(getInstallUrl(wallet.name), "_blank")}
                      >
                        <ExternalLink className="w-4 h-4 mr-1" />
                        Install
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </>
          ) : (
            <Card className="border-orange-200 bg-orange-50">
              <CardContent className="pt-6">
                <div className="flex items-center gap-2 text-orange-800">
                  <AlertCircle className="w-5 h-5" />
                  <p className="font-medium">No SUI Wallets Detected</p>
                </div>
                <p className="text-sm text-orange-700 mt-2">Install a SUI wallet extension to connect and play</p>
              </CardContent>
            </Card>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
