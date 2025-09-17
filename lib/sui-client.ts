import { SuiClient, getFullnodeUrl } from "@mysten/sui/client"

// Get network from environment variable, fallback to devnet
export const NETWORK = (process.env.NEXT_PUBLIC_NETWORK as "devnet" | "testnet" | "mainnet") || "devnet"

// Get package ID from environment variable
export const PACKAGE_ID = process.env.NEXT_PUBLIC_PACKAGE_ID || "0x0"

export const suiClient = new SuiClient({
  url: getFullnodeUrl(NETWORK),
})

// Module name from the SUI Move contract
export const MODULE_NAME = "main"
