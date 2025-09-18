import { Transaction } from "@mysten/sui/transactions"
import { suiClient, PACKAGE_ID, MODULE_NAME, NETWORK } from "@/lib/sui-client"

/**
 * Creates a bet (criar_aposta) by calling the SUI Move contract
 * @param senderAddress - Address of the player creating the bet
 * @param coinObjectId - Object ID of the SUI coin to use for betting
 * @param amount - Amount to bet in MIST (1 SUI = 1,000,000,000 MIST)
 * @param signAndExecuteTransaction - Function from wallet to sign and execute
 * @param gasCoinId - Optional explicit gas coin object ID for gas payment
 * @returns Promise with transaction result and treasury object ID
 */
export async function criarAposta(
  senderAddress: string,
  coinObjectId: string,
  amount: string,
  signAndExecuteTransaction: any,
  gasCoin?: any  // Changed from gasCoinId string to full gas coin object
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
    
    // Set the sender address for the transaction
    tx.setSender(senderAddress)
    console.log("[v0] criarAposta: Transaction sender set to:", senderAddress)
    
    // Set explicit gas coin if provided - use complete coin object
    if (gasCoin && gasCoin.coinObjectId !== coinObjectId) {
      console.log("[v0] criarAposta: Using explicit gas coin:", gasCoin.coinObjectId)
      tx.setGasPayment([{
        objectId: gasCoin.coinObjectId,
        version: gasCoin.version,
        digest: gasCoin.digest
      }])
      console.log("[v0] criarAposta: Set gas payment with complete object reference")
    } else {
      console.log("[v0] criarAposta: SUI SDK will handle gas payment automatically from available coins")
    }
    
    // Call the criar_aposta function - Move function expects (mut coin: Coin<SUI>, amount: u64, ctx: &mut TxContext)
    // Split the coin to the exact bet amount and pass the split coin
    const betCoin = tx.splitCoins(tx.object(coinObjectId), [tx.pure.u64(amount)])
    tx.moveCall({
      target: `${PACKAGE_ID}::${MODULE_NAME}::criar_aposta`,
      arguments: [betCoin, tx.pure.u64(amount)],
    })

    console.log("[v0] criarAposta: Transaction prepared, executing...")

    // Execute the transaction using the modern dapp-kit pattern
    const result = await new Promise((resolve, reject) => {
      signAndExecuteTransaction(
        {
          transaction: tx,
        },
        {
          onSuccess: (result: any) => {
            console.log(`[v0] criarAposta transaction successful with digest: ${result.digest}`)
            resolve(result)
          },
          onError: (error: any) => {
            console.error(`[v0] criarAposta transaction failed:`, error)
            reject(error)
          },
        }
      )
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
 * @param gasCoinId - Optional explicit gas coin object ID for gas payment
 * @returns Promise with transaction result
 */
export async function entrarAposta(
  senderAddress: string,
  treasuryId: string,
  coinObjectId: string,
  amount: string,
  signAndExecuteTransaction: any,
  gasCoin?: any  // Changed from gasCoinId string to full gas coin object
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
    
    // Set the sender address for the transaction
    tx.setSender(senderAddress)
    console.log("[v0] entrarAposta: Transaction sender set to:", senderAddress)
    
    // Set explicit gas coin if provided - use complete coin object
    if (gasCoin && gasCoin.coinObjectId !== coinObjectId) {
      console.log("[v0] entrarAposta: Using explicit gas coin:", gasCoin.coinObjectId)
      tx.setGasPayment([{
        objectId: gasCoin.coinObjectId,
        version: gasCoin.version,
        digest: gasCoin.digest
      }])
      console.log("[v0] entrarAposta: Set gas payment with complete object reference")
    } else {
      console.log("[v0] entrarAposta: SUI SDK will handle gas payment automatically from available coins")
    }
    
    // Call the entrar_aposta function - Move function expects (treasury: &mut Treasury, mut coin: Coin<SUI>, amount: u64, ctx: &mut TxContext)
    // Split the coin to the exact bet amount and pass the split coin
    const betCoin = tx.splitCoins(tx.object(coinObjectId), [tx.pure.u64(amount)])
    tx.moveCall({
      target: `${PACKAGE_ID}::${MODULE_NAME}::entrar_aposta`,
      arguments: [tx.object(treasuryId), betCoin, tx.pure.u64(amount)],
    })

    console.log("[v0] entrarAposta: Transaction prepared, executing...")

    // Execute the transaction using the modern dapp-kit pattern
    const result = await new Promise((resolve, reject) => {
      signAndExecuteTransaction(
        {
          transaction: tx,
        },
        {
          onSuccess: (result: any) => {
            console.log(`[v0] entrarAposta transaction successful with digest: ${result.digest}`)
            resolve(result)
          },
          onError: (error: any) => {
            console.error(`[v0] entrarAposta transaction failed:`, error)
            reject(error)
          },
        }
      )
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
 * @param senderAddress - Address of the player finishing the game
 * @param winnerAddress - Address of the winner
 * @param treasuryId - Object ID of the Treasury to distribute
 * @param signAndExecuteTransaction - Function from wallet to sign and execute
 * @returns Promise with transaction result
 */
export async function finishGame(
  senderAddress: string,
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
    console.log("[v0] finishGame: Sender address:", senderAddress)
    console.log("[v0] finishGame: Winner address:", winnerAddress)
    console.log("[v0] finishGame: Treasury ID:", treasuryId)

    const tx = new Transaction()
    
    // Set the sender address for the transaction
    tx.setSender(senderAddress)
    console.log("[v0] finishGame: Transaction sender set to:", senderAddress)
    
    console.log("[v0] finishGame: SUI SDK will handle gas payment automatically from available coins")
    
    // Call the finish_game function
    tx.moveCall({
      target: `${PACKAGE_ID}::${MODULE_NAME}::finish_game`,
      arguments: [tx.pure.address(winnerAddress), tx.object(treasuryId)],
    })

    console.log("[v0] finishGame: Transaction prepared, executing...")

    // Execute the transaction using the modern dapp-kit pattern
    const result = await new Promise((resolve, reject) => {
      signAndExecuteTransaction(
        {
          transaction: tx,
        },
        {
          onSuccess: (result: any) => {
            console.log(`[v0] finishGame transaction successful with digest: ${result.digest}`)
            resolve(result)
          },
          onError: (error: any) => {
            console.error(`[v0] finishGame transaction failed:`, error)
            reject(error)
          },
        }
      )
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
 * Selects coins for betting with gas coin strategy - provides both betting coin and gas coin options
 * @param coins - Available coins
 * @param betAmountMist - Required bet amount in MIST
 * @returns Object with betting coin validation and gas strategy
 */
export function selectCoinsForBettingWithGasStrategy(coins: any[], betAmountMist: string) {
  const betAmount = parseInt(betAmountMist)
  const gasReserveMist = 10_000_000 // 0.01 SUI
  
  console.log("[v0] selectCoinsForBettingWithGasStrategy: Analyzing", coins.length, "coins")
  console.log("[v0] selectCoinsForBettingWithGasStrategy: Bet amount:", betAmount, "MIST")
  console.log("[v0] selectCoinsForBettingWithGasStrategy: Gas reserve:", gasReserveMist, "MIST")
  
  // Strategy 1: Find a single coin that can handle both bet and gas
  const singleCoinSolution = coins.find(coin => parseInt(coin.balance) >= betAmount + gasReserveMist)
  
  if (singleCoinSolution) {
    console.log("[v0] Strategy 1 - Single coin solution found:", singleCoinSolution.coinObjectId)
    return {
      strategy: "single_coin",
      bettingCoin: singleCoinSolution,
      gasCoin: singleCoinSolution,
      isValid: true,
      gasReserve: gasReserveMist
    }
  }
  
  // Strategy 2: Find separate coins for betting and gas
  const bettingCoin = coins.find(coin => parseInt(coin.balance) >= betAmount)
  const gasCoin = coins.find(coin => 
    coin.coinObjectId !== bettingCoin?.coinObjectId && 
    parseInt(coin.balance) >= gasReserveMist
  )
  
  if (bettingCoin && gasCoin) {
    console.log("[v0] Strategy 2 - Separate coins solution found")
    console.log("[v0] Betting coin:", bettingCoin.coinObjectId)
    console.log("[v0] Gas coin:", gasCoin.coinObjectId)
    return {
      strategy: "separate_coins",
      bettingCoin,
      gasCoin,
      isValid: true,
      gasReserve: gasReserveMist
    }
  }
  
  // Strategy 3: Check if we have enough total balance but need coin consolidation
  const totalBalance = coins.reduce((sum, coin) => sum + parseInt(coin.balance), 0)
  
  if (totalBalance >= betAmount + gasReserveMist) {
    return {
      strategy: "needs_consolidation",
      bettingCoin: null,
      gasCoin: null,
      isValid: false,
      error: `Sufficient total balance (${mistToSui(totalBalance.toString())} SUI) but needs coin consolidation. Consider consolidating your coins first.`,
      totalBalance,
      requiredBalance: betAmount + gasReserveMist
    }
  }
  
  // Strategy 4: Insufficient balance
  return {
    strategy: "insufficient_balance",
    bettingCoin: null,
    gasCoin: null,
    isValid: false,
    error: `Insufficient balance. Need ${mistToSui((betAmount + gasReserveMist).toString())} SUI (${mistToSui(betAmount.toString())} for bet + ${mistToSui(gasReserveMist.toString())} for gas), but only have ${mistToSui(totalBalance.toString())} SUI`,
    totalBalance,
    requiredBalance: betAmount + gasReserveMist
  }
}

/**
 * Selects a suitable coin for betting with proper gas fee reservation
 * @param coins - Available coins
 * @param betAmountMist - Required bet amount in MIST
 * @returns Object with betting coin validation
 */
export function selectCoinsForBetting(coins: any[], betAmountMist: string) {
  const betAmount = parseInt(betAmountMist)
  
  // Reserve gas fees (0.01 SUI = 10,000,000 MIST) - reasonable estimate for most transactions
  const gasReserveMist = 10_000_000
  const totalRequiredBalance = betAmount + gasReserveMist
  
  console.log("[v0] selectCoinsForBetting: Bet amount:", betAmount, "MIST")
  console.log("[v0] selectCoinsForBetting: Gas reserve:", gasReserveMist, "MIST")
  console.log("[v0] selectCoinsForBetting: Total required:", totalRequiredBalance, "MIST")
  
  // Find a coin that can cover both the bet amount and gas fees
  const bettingCoin = coins.find(coin => parseInt(coin.balance) >= totalRequiredBalance)
  
  if (!bettingCoin) {
    // Check if there's enough total balance across all coins
    const totalBalance = coins.reduce((sum, coin) => sum + parseInt(coin.balance), 0)
    
    if (totalBalance < totalRequiredBalance) {
      return {
        bettingCoin: null,
        isValid: false,
        error: `Insufficient balance. Need ${mistToSui(totalRequiredBalance.toString())} SUI (${mistToSui(betAmount.toString())} for bet + ${mistToSui(gasReserveMist.toString())} for gas), but only have ${mistToSui(totalBalance.toString())} SUI`
      }
    } else {
      return {
        bettingCoin: null,
        isValid: false,
        error: `No single coin with sufficient balance. Need one coin with at least ${mistToSui(totalRequiredBalance.toString())} SUI (bet + gas). Consider consolidating your coins.`
      }
    }
  }
  
  console.log("[v0] selectCoinsForBetting: Selected coin with balance:", bettingCoin.balance, "MIST")
  
  return {
    bettingCoin,
    isValid: true,
    gasReserve: gasReserveMist
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