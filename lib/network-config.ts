import { getFullnodeUrl } from "@mysten/sui/client"

// Get network from environment variable, fallback to devnet
export const getCurrentNetwork = () => {
  return (process.env.NEXT_PUBLIC_NETWORK as "devnet" | "testnet" | "mainnet") || "devnet"
}

// Get the current network URL
export const getCurrentNetworkUrl = () => {
  return getFullnodeUrl(getCurrentNetwork())
}

// Get comprehensive network information
export const getNetworkInfo = () => {
  const network = getCurrentNetwork()
  return {
    network,
    endpoint: getCurrentNetworkUrl(),
    isTestnet: network === "testnet",
    isMainnet: network === "mainnet",
    isDevnet: network === "devnet",
  }
}