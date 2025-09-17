import { Transaction } from "@mysten/sui/transactions"
import { suiClient, PACKAGE_ID, MODULE_NAME, NETWORK } from "@/lib/sui-client"

/**
 * Creates a bet (criar_aposta) by calling the SUI Move contract
 * @param senderAddress - Address of the player creating the bet
 * @param coinObjectId - Object ID of the SUI coin to use for betting
 * @param amount - Amount to bet in MIST (1 SUI = 1,000,000,000 MIST)
 * @param signAndExecuteTransaction - Function from wallet to sign and execute
 * @returns Promise with transaction result and treasury object ID
 */
export async function criarAposta(
  senderAddress: string,
  coinObjectId: string,
  amount: string,
  signAndExecuteTransaction: any
) {
  try {
    // Check if package ID is properly configured
    if (PACKAGE_ID === "0x0") {
      throw new Error("Package ID not configured. Please set NEXT_PUBLIC_PACKAGE_ID environment variable.")
    }

    console.log("[v0] criarAposta: Creating bet with package:", PACKAGE_ID)
    console.log("[v0] criarAposta: Amount:", amount, "MIST")
    console.log("[v0] criarAposta: Coin object ID:", coinObjectId)
    console.log("[v0] criarAposta: Note: Passing original coin, Move function handles splitting")

    const tx = new Transaction()
    
    console.log("[v0] criarAposta: Letting SUI SDK automatically handle gas payment")
    
    // Call the criar_aposta function with the original coin and amount
    // The Move function will handle the coin splitting internally
    tx.moveCall({
      target: `${PACKAGE_ID}::${MODULE_NAME}::criar_aposta`,
      arguments: [tx.object(coinObjectId), tx.pure.u64(amount)],
    })

    console.log("[v0] criarAposta: Transaction prepared, executing...")

    // Execute the transaction
    const result = await signAndExecuteTransaction({
      transaction: tx,
      chain: `sui:${NETWORK}`,
    })

    console.log("[v0] criarAposta: Transaction result:", result)

    // Get the created objects to find the Treasury object
    const txDetails = await suiClient.getTransactionBlock({
      digest: result.digest,
      options: {
        showEffects: true,
        showObjectChanges: true,
      },
    })

    // Find the shared Treasury object
    let treasuryId = null
    if (txDetails.objectChanges) {
      for (const change of txDetails.objectChanges) {
        if (change.type === 'created' && change.objectType?.includes('Treasury')) {
          treasuryId = change.objectId
          break
        }
      }
    }

    return {
      success: true,
      digest: result.digest,
      treasuryId,
    }
  } catch (error) {
    console.error("Error in criarAposta:", error)
    return {
      success: false,
      error: error.message || "Failed to create bet",
    }
  }
}

/**
 * Joins a bet (entrar_aposta) by calling the SUI Move contract
 * @param senderAddress - Address of the player joining the bet
 * @param treasuryId - Object ID of the Treasury to join
 * @param coinObjectId - Object ID of the SUI coin to use for betting
 * @param amount - Amount to bet in MIST
 * @param signAndExecuteTransaction - Function from wallet to sign and execute
 * @returns Promise with transaction result
 */
export async function entrarAposta(
  senderAddress: string,
  treasuryId: string,
  coinObjectId: string,
  amount: string,
  signAndExecuteTransaction: any
) {
  try {
    // Check if package ID is properly configured
    if (PACKAGE_ID === "0x0") {
      throw new Error("Package ID not configured. Please set NEXT_PUBLIC_PACKAGE_ID environment variable.")
    }

    console.log("[v0] entrarAposta: Joining bet with package:", PACKAGE_ID)
    console.log("[v0] entrarAposta: Amount:", amount, "MIST")
    console.log("[v0] entrarAposta: Treasury ID:", treasuryId)
    console.log("[v0] entrarAposta: Coin object ID:", coinObjectId)
    console.log("[v0] entrarAposta: Note: Passing original coin, Move function handles splitting")

    const tx = new Transaction()
    
    console.log("[v0] entrarAposta: Letting SUI SDK automatically handle gas payment")
    
    // Call the entrar_aposta function with the original coin and amount
    // The Move function will handle the coin splitting internally
    tx.moveCall({
      target: `${PACKAGE_ID}::${MODULE_NAME}::entrar_aposta`,
      arguments: [tx.object(treasuryId), tx.object(coinObjectId), tx.pure.u64(amount)],
    })

    console.log("[v0] entrarAposta: Transaction prepared, executing...")

    // Execute the transaction
    const result = await signAndExecuteTransaction({
      transaction: tx,
      chain: `sui:${NETWORK}`,
    })

    console.log("[v0] entrarAposta: Transaction result:", result)

    return {
      success: true,
      digest: result.digest,
    }
  } catch (error) {
    console.error("Error in entrarAposta:", error)
    return {
      success: false,
      error: error.message || "Failed to join bet",
    }
  }
}

/**
 * Finishes the game (finish_game) by calling the SUI Move contract
 * @param winnerAddress - Address of the winner
 * @param treasuryId - Object ID of the Treasury to distribute
 * @param signAndExecuteTransaction - Function from wallet to sign and execute
 * @returns Promise with transaction result
 */
export async function finishGame(
  winnerAddress: string,
  treasuryId: string,
  signAndExecuteTransaction: any
) {
  try {
    // Check if package ID is properly configured
    if (PACKAGE_ID === "0x0") {
      throw new Error("Package ID not configured. Please set NEXT_PUBLIC_PACKAGE_ID environment variable.")
    }

    console.log("[v0] finishGame: Finishing game with package:", PACKAGE_ID)
    console.log("[v0] finishGame: Winner address:", winnerAddress)
    console.log("[v0] finishGame: Treasury ID:", treasuryId)

    const tx = new Transaction()
    
    console.log("[v0] finishGame: Letting SUI SDK automatically handle gas payment")
    
    // Call the finish_game function
    tx.moveCall({
      target: `${PACKAGE_ID}::${MODULE_NAME}::finish_game`,
      arguments: [tx.pure.address(winnerAddress), tx.object(treasuryId)],
    })

    console.log("[v0] finishGame: Transaction prepared, executing...")

    // Execute the transaction
    const result = await signAndExecuteTransaction({
      transaction: tx,
      chain: `sui:${NETWORK}`,
    })

    console.log("finish_game transaction result:", result)

    return {
      success: true,
      digest: result.digest,
    }
  } catch (error) {
    console.error("Error in finishGame:", error)
    return {
      success: false,
      error: error.message || "Failed to finish game",
    }
  }
}

/**
 * Gets user's SUI coins for betting with better validation
 * @param ownerAddress - Address of the coin owner
 * @returns Promise with available coins
 */
export async function getUserCoins(ownerAddress: string) {
  try {
    console.log("[v0] getUserCoins: Fetching coins for address:", ownerAddress)
    console.log("[v0] getUserCoins: Using network:", NETWORK)
    console.log("[v0] getUserCoins: Using package ID:", PACKAGE_ID)
    
    const coins = await suiClient.getCoins({
      owner: ownerAddress,
      coinType: '0x2::sui::SUI',
    })

    console.log("[v0] getUserCoins: Raw response:", coins)
    console.log("[v0] getUserCoins: Found", coins.data.length, "coins")

    // Sort coins by balance (descending) to prioritize larger coins for betting
    const sortedCoins = coins.data.sort((a, b) => parseInt(b.balance) - parseInt(a.balance))

    return {
      success: true,
      coins: sortedCoins,
    }
  } catch (error) {
    console.error("[v0] getUserCoins: Error getting user coins:", error)
    return {
      success: false,
      error: error.message || "Failed to get coins",
    }
  }
}

/**
 * Selects a suitable coin for betting (gas will be handled automatically by SUI SDK)
 * @param coins - Available coins
 * @param betAmountMist - Required bet amount in MIST
 * @returns Object with betting coin validation
 */
export function selectCoinsForBetting(coins: any[], betAmountMist: string) {
  const betAmount = parseInt(betAmountMist)
  
  // Find any coin that can cover the bet amount
  // SUI SDK will automatically handle gas payment from available coins
  const bettingCoin = coins.find(coin => parseInt(coin.balance) >= betAmount)
  
  if (!bettingCoin) {
    return {
      bettingCoin: null,
      isValid: false,
      error: "No coin with sufficient balance for betting amount"
    }
  }
  
  return {
    bettingCoin,
    isValid: true
  }
}

/**
 * Converts SUI amount to MIST (1 SUI = 1,000,000,000 MIST)
 * @param suiAmount - Amount in SUI
 * @returns Amount in MIST as string
 */
export function suiToMist(suiAmount: string): string {
  const sui = parseFloat(suiAmount)
  const mist = Math.floor(sui * 1_000_000_000)
  return mist.toString()
}

/**
 * Converts MIST amount to SUI
 * @param mistAmount - Amount in MIST
 * @returns Amount in SUI as string
 */
export function mistToSui(mistAmount: string): string {
  const mist = parseInt(mistAmount)
  const sui = mist / 1_000_000_000
  return sui.toString()
}