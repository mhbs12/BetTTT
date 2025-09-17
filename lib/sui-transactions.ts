import { Transaction } from "@mysten/sui/transactions"
import { PACKAGE_ID } from "./sui-client"

export interface BetTransaction {
  type: "criar_aposta" | "entrar_aposta" | "finish_game"
  amount?: string
  treasuryId?: string
  winner?: string
}

/**
 * Create a transaction for creating a bet (criar_aposta)
 * @param coinObjectId - The SUI coin object ID from the user's wallet
 * @param amount - Amount to bet in SUI (in MIST units)
 */
export function createBetTransaction(coinObjectId: string, amount: string): Transaction {
  const tx = new Transaction()

  // The Move function expects (mut coin: Coin<SUI>, amount: u64, ctx: &mut TxContext)
  // Pass the original coin object - the Move function will handle splitting internally
  tx.moveCall({
    target: `${PACKAGE_ID}::main::criar_aposta`,
    arguments: [
      tx.object(coinObjectId),
      tx.pure.u64(amount),
    ],
  })

  return tx
}

/**
 * Create a transaction for joining a bet (entrar_aposta)
 * @param treasuryId - The shared treasury object ID
 * @param coinObjectId - The SUI coin object ID from the user's wallet
 * @param amount - Amount to bet in SUI (in MIST units)
 */
export function joinBetTransaction(treasuryId: string, coinObjectId: string, amount: string): Transaction {
  const tx = new Transaction()

  // The Move function expects (treasury: &mut Treasury, mut coin: Coin<SUI>, amount: u64, ctx: &mut TxContext)
  // Pass the original coin object - the Move function will handle splitting internally
  tx.moveCall({
    target: `${PACKAGE_ID}::main::entrar_aposta`,
    arguments: [
      tx.object(treasuryId),
      tx.object(coinObjectId),
      tx.pure.u64(amount),
    ],
  })

  return tx
}

/**
 * Create a transaction for finishing the game and distributing the prize
 * @param winnerAddress - The address of the winner
 * @param treasuryId - The shared treasury object ID
 */
export function finishGameTransaction(winnerAddress: string, treasuryId: string): Transaction {
  const tx = new Transaction()

  tx.moveCall({
    target: `${PACKAGE_ID}::main::finish_game`,
    arguments: [
      tx.pure.address(winnerAddress),
      tx.object(treasuryId),
    ],
  })

  return tx
}

/**
 * Convert SUI amount to MIST (smallest unit)
 * 1 SUI = 1,000,000,000 MIST
 */
export function suiToMist(suiAmount: string): string {
  const amount = parseFloat(suiAmount)
  if (isNaN(amount) || amount <= 0) {
    throw new Error("Invalid SUI amount")
  }
  return Math.floor(amount * 1_000_000_000).toString()
}

/**
 * Convert MIST to SUI for display
 */
export function mistToSui(mistAmount: string): string {
  const amount = parseFloat(mistAmount)
  if (isNaN(amount)) {
    return "0"
  }
  return (amount / 1_000_000_000).toFixed(9).replace(/\.0+$/, "")
}