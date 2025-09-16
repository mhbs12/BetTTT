import { SuiClient, getFullnodeUrl } from "@mysten/sui/client"

// Get network from environment variable, fallback to devnet
const network = (process.env.NEXT_PUBLIC_SUI_NETWORK as "mainnet" | "testnet" | "devnet") || "devnet"

export const suiClient = new SuiClient({
  url: getFullnodeUrl(network),
})

export const NETWORK = network
export const PACKAGE_ID = process.env.NEXT_PUBLIC_PACKAGE_ID || "0x0"
