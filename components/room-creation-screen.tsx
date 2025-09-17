"use client"

import { useState, useEffect } from "react"
import { useWallet } from "@suiet/wallet-kit"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { WalletConnectPopup } from "@/components/wallet-connect-popup"
import { createRoom, joinRoom, getAvailableRooms, updateRoomTreasury } from "@/app/actions/game-actions"
import { criarAposta, entrarAposta, getUserCoins, suiToMist, selectCoinsForBetting } from "@/lib/sui-contract"
import { PACKAGE_ID, NETWORK } from "@/lib/sui-client"
import { Plus, Hash, Sparkles, GamepadIcon, Users, Coins, AlertTriangle, CheckCircle } from "lucide-react"
import type { GameRoom } from "@/lib/game-store"

interface RoomCreationScreenProps {
  onRoomCreated: (room: GameRoom) => void
}

export function RoomCreationScreen({ onRoomCreated }: RoomCreationScreenProps) {
  const { connected, account, signAndExecuteTransaction } = useWallet()
  const [roomName, setRoomName] = useState("")
  const [roomId, setRoomId] = useState("")
  const [betAmount, setBetAmount] = useState("")
  const [joinBetAmount, setJoinBetAmount] = useState("")
  const [activeTab, setActiveTab] = useState<"create" | "join">("create")
  const [loading, setLoading] = useState(false)
  const [showWalletPopup, setShowWalletPopup] = useState(false)
  const [availableRooms, setAvailableRooms] = useState<GameRoom[]>([])
  const [userCoins, setUserCoins] = useState<any[]>([])
  const [error, setError] = useState<string>("")
  const [success, setSuccess] = useState<string>("")

  useEffect(() => {
    const fetchRooms = async () => {
      const result = await getAvailableRooms()
      if (result.success) {
        setAvailableRooms(result.rooms || [])
      }
    }

    fetchRooms()
    const interval = setInterval(fetchRooms, 3000)

    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    const fetchUserCoins = async () => {
      if (connected && account?.address) {
        console.log("[v0] Fetching user coins for address:", account.address)
        const result = await getUserCoins(account.address)
        console.log("[v0] getUserCoins result:", result)
        
        if (result.success) {
          setUserCoins(result.coins || [])
          console.log("[v0] Successfully fetched", result.coins?.length || 0, "coins")
        } else {
          console.error("[v0] Failed to get user coins:", result.error)
          setUserCoins([])
          // Don't set error here as it might be a temporary network issue
        }
      } else {
        setUserCoins([])
      }
    }

    fetchUserCoins()
  }, [connected, account?.address])

  const handleCreateRoom = async () => {
    if (!account?.address || !roomName.trim() || !betAmount.trim()) {
      setError("Please fill in all required fields")
      return
    }

    console.log("[v0] Creating room with name:", roomName, "bet amount:", betAmount)
    setLoading(true)
    setError("")
    setSuccess("")

    try {
      const playerName = `${account.address.slice(0, 6)}...${account.address.slice(-4)}`
      
      // First, check if we have coins and validate the bet
      let treasuryId = null
      
      if (userCoins.length === 0) {
        console.log("[v0] No coins found. Attempting to refresh coin data...")
        // Try to refresh coin data in case it's a timing issue
        const coinRefreshResult = await getUserCoins(account.address)
        console.log("[v0] Coin refresh result:", coinRefreshResult)
        
        if (coinRefreshResult.success && coinRefreshResult.coins && coinRefreshResult.coins.length > 0) {
          setUserCoins(coinRefreshResult.coins)
          console.log("[v0] Successfully refreshed", coinRefreshResult.coins.length, "coins")
        } else {
          const errorMsg = coinRefreshResult.success 
            ? "No SUI coins available for betting. Please fund your wallet." 
            : `Failed to check SUI balance: ${coinRefreshResult.error || "Unknown error"}`
          setError(errorMsg)
          setLoading(false)
          return
        }
      }

      // Use improved coin selection for betting
      const betAmountMist = suiToMist(betAmount)
      const coinSelection = selectCoinsForBetting(userCoins, betAmountMist)
      
      if (!coinSelection.isValid) {
        setError(coinSelection.error || "Unable to select appropriate coins for betting")
        setLoading(false)
        return
      }

      console.log("[v0] Selected optimal coin for betting:", coinSelection.bettingCoin.coinObjectId)
      console.log("[v0] Gas payment will be handled automatically by SUI SDK")

      console.log("[v0] Creating SUI contract bet first...")
      setSuccess("Creating blockchain bet, please sign the transaction in your wallet...")

      // Call the SUI contract to create the bet FIRST
      const contractResult = await criarAposta(
        account.address,
        coinSelection.bettingCoin.coinObjectId,
        betAmountMist,
        signAndExecuteTransaction
      )

      if (!contractResult.success || !contractResult.treasuryId) {
        console.error("[v0] Failed to create SUI contract bet:", contractResult.error)
        setError(`Failed to create blockchain bet: ${contractResult.error || "Transaction failed"}`)
        setLoading(false)
        return
      }

      treasuryId = contractResult.treasuryId
      console.log("[v0] SUI contract bet created successfully:", treasuryId)
      setSuccess("Blockchain bet confirmed! Creating room...")

      // Now create the room with the treasury ID
      const roomResult = await createRoom(roomName.trim(), account.address, playerName, betAmount, treasuryId)
      
      if (!roomResult.success || !roomResult.room) {
        console.error("[v0] Failed to create room:", roomResult.error)
        setError(`Failed to create room: ${roomResult.error || "Unknown error"}`)
        setLoading(false)
        return
      }

      console.log("[v0] Room created successfully with SUI contract integration")
      setSuccess("Room created successfully with blockchain betting!")
      onRoomCreated(roomResult.room)

    } catch (error) {
      console.error("[v0] Error creating room:", error)
      setError(`Failed to create room: ${error instanceof Error ? error.message : "Unknown error"}`)
    } finally {
      setLoading(false)
    }
  }

  const handleJoinRoom = async () => {
    if (!account?.address || !roomId.trim() || !joinBetAmount.trim()) {
      setError("Please fill in all required fields")
      return
    }

    console.log("[v0] Joining room with ID:", roomId, "bet amount:", joinBetAmount)
    setLoading(true)
    setError("")
    setSuccess("")

    try {
      const playerName = `${account.address.slice(0, 6)}...${account.address.slice(-4)}`
      
      // Get the room first to check bet amount and treasury ID
      const roomToJoin = availableRooms.find(room => room.id.toUpperCase() === roomId.trim().toUpperCase())
      
      if (!roomToJoin) {
        setError("Room not found. Please check the Room ID.")
        setLoading(false)
        return
      }

      // Check if bet amounts match
      if (roomToJoin.betAmount && joinBetAmount !== roomToJoin.betAmount) {
        setError(`Bet amount must match room bet amount: ${roomToJoin.betAmount} SUI`)
        setLoading(false)
        return
      }

      // If room has a treasury (contract betting), join the bet first
      if (roomToJoin.treasuryId && roomToJoin.betAmount) {
        try {
          // Find a suitable coin for the bet
          if (userCoins.length === 0) {
            console.log("[v0] No coins found for join. Attempting to refresh coin data...")
            // Try to refresh coin data in case it's a timing issue
            const coinRefreshResult = await getUserCoins(account.address)
            console.log("[v0] Join coin refresh result:", coinRefreshResult)
            
            if (coinRefreshResult.success && coinRefreshResult.coins && coinRefreshResult.coins.length > 0) {
              setUserCoins(coinRefreshResult.coins)
              console.log("[v0] Successfully refreshed", coinRefreshResult.coins.length, "coins for join")
            } else {
              const errorMsg = coinRefreshResult.success 
                ? "No SUI coins available for betting. Please fund your wallet." 
                : `Failed to check SUI balance: ${coinRefreshResult.error || "Unknown error"}`
              setError(errorMsg)
              setLoading(false)
              return
            }
          }

          // Use improved coin selection for betting
          const betAmountMist = suiToMist(joinBetAmount)
          const coinSelection = selectCoinsForBetting(userCoins, betAmountMist)
          
          if (!coinSelection.isValid) {
            setError(coinSelection.error || "Unable to select appropriate coins for betting")
            setLoading(false)
            return
          }

          console.log("[v0] Selected optimal coin for joining bet:", coinSelection.bettingCoin.coinObjectId)
          console.log("[v0] Gas payment will be handled automatically by SUI SDK")

          // Call the SUI contract to join the bet
          const contractResult = await entrarAposta(
            account.address,
            roomToJoin.treasuryId,
            coinSelection.bettingCoin.coinObjectId,
            betAmountMist,
            signAndExecuteTransaction
          )

          if (!contractResult.success) {
            setError(`Failed to join contract bet: ${contractResult.error || "Unknown error"}`)
            setLoading(false)
            return
          }
        } catch (contractError) {
          setError(`Blockchain betting failed: ${contractError instanceof Error ? contractError.message : "Unknown error"}`)
          setLoading(false)
          return
        }
      }

      // Join the room
      const result = await joinRoom(roomId.trim().toUpperCase(), account.address, playerName)

      if (result.success && result.room) {
        console.log("[v0] Room joined successfully:", result.room)
        setSuccess("Successfully joined the room!")
        onRoomCreated(result.room)
      } else {
        setError(`Failed to join room: ${result.error || "Unknown error"}`)
      }
    } catch (error) {
      console.error("[v0] Error joining room:", error)
      setError(`Failed to join room: ${error instanceof Error ? error.message : "Unknown error"}`)
    } finally {
      setLoading(false)
    }
  }

  const handleJoinAvailableRoom = async (room: GameRoom) => {
    if (!account?.address) {
      setError("Please connect your wallet first")
      return
    }

    console.log("[v0] Joining available room:", room.id)
    setLoading(true)
    setError("")
    setSuccess("")

    try {
      const playerName = `${account.address.slice(0, 6)}...${account.address.slice(-4)}`
      
      // If room has a treasury (contract betting), join the bet first
      if (room.treasuryId && room.betAmount) {
        try {
          // Find a suitable coin for the bet
          if (userCoins.length === 0) {
            console.log("[v0] No coins found for join room. Attempting to refresh coin data...")
            // Try to refresh coin data in case it's a timing issue
            const coinRefreshResult = await getUserCoins(account.address)
            console.log("[v0] Join room coin refresh result:", coinRefreshResult)
            
            if (coinRefreshResult.success && coinRefreshResult.coins && coinRefreshResult.coins.length > 0) {
              setUserCoins(coinRefreshResult.coins)
              console.log("[v0] Successfully refreshed", coinRefreshResult.coins.length, "coins for join room")
            } else {
              const errorMsg = coinRefreshResult.success 
                ? "No SUI coins available for betting. Please fund your wallet." 
                : `Failed to check SUI balance: ${coinRefreshResult.error || "Unknown error"}`
              setError(errorMsg)
              setLoading(false)
              return
            }
          }

          // Use improved coin selection for betting
          const betAmountMist = suiToMist(room.betAmount)
          const coinSelection = selectCoinsForBetting(userCoins, betAmountMist)
          
          if (!coinSelection.isValid) {
            setError(coinSelection.error || "Unable to select appropriate coins for betting")
            setLoading(false)
            return
          }

          console.log("[v0] Selected optimal coin for joining available room:", coinSelection.bettingCoin.coinObjectId)
          console.log("[v0] Gas payment will be handled automatically by SUI SDK")

          // Call the SUI contract to join the bet
          const contractResult = await entrarAposta(
            account.address,
            room.treasuryId,
            coinSelection.bettingCoin.coinObjectId,
            betAmountMist,
            signAndExecuteTransaction
          )

          if (!contractResult.success) {
            setError(`Failed to join contract bet: ${contractResult.error || "Unknown error"}`)
            setLoading(false)
            return
          }
        } catch (contractError) {
          setError(`Blockchain betting failed: ${contractError instanceof Error ? contractError.message : "Unknown error"}`)
          setLoading(false)
          return
        }
      }

      // Join the room
      const result = await joinRoom(room.id, account.address, playerName)

      if (result.success && result.room) {
        console.log("[v0] Joined room successfully:", result.room)
        setSuccess("Successfully joined the room!")
        onRoomCreated(result.room)
      } else {
        setError(`Failed to join room: ${result.error || "Unknown error"}`)
      }
    } catch (error) {
      console.error("[v0] Error joining room:", error)
      setError(`Failed to join room: ${error instanceof Error ? error.message : "Unknown error"}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6">
      <div className="flex justify-end mb-6 h-10">
        {!connected ? (
          <Button
            variant="outline"
            onClick={() => setShowWalletPopup(true)}
            className="glass-card hover:bg-primary/10 transition-all duration-300 gap-2"
          >
            <Sparkles className="h-4 w-4" />
            Connect Wallet
          </Button>
        ) : (
          <div className="flex items-center gap-2 px-3 py-2 bg-accent/10 rounded-lg text-sm">
            <div className="h-2 w-2 rounded-full bg-accent animate-pulse" />
            <span className="font-mono text-accent">
              {account?.address?.slice(0, 6)}...{account?.address?.slice(-4)}
            </span>
          </div>
        )}
      </div>

      {/* Configuration Warning */}
      {PACKAGE_ID === "0x0" && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <strong>Configuration Required:</strong> Please set NEXT_PUBLIC_PACKAGE_ID in your .env file to your deployed SUI Move package ID. 
            Currently using default value which will cause betting functions to fail.
            <br />
            <span className="text-xs text-muted-foreground mt-1 block">
              Network: {NETWORK} | Package ID: {PACKAGE_ID}
            </span>
          </AlertDescription>
        </Alert>
      )}

      {/* Error and Success Messages */}
      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      
      {success && (
        <Alert className="border-green-200 bg-green-50">
          <CheckCircle className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800">{success}</AlertDescription>
        </Alert>
      )}

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="glass-card border-primary/20 shadow-xl">
          <CardHeader className="pb-4">
            <CardTitle className="text-center flex items-center justify-center gap-2 text-xl">
              <Plus className="h-5 w-5 text-primary" />
              Create New Room
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <label htmlFor="roomName" className="text-sm font-medium text-card-foreground">
                Room Name
              </label>
              <Input
                id="roomName"
                placeholder="Enter room name"
                value={roomName}
                onChange={(e) => {
                  setRoomName(e.target.value)
                  setError("")
                  setSuccess("")
                }}
                onKeyPress={(e) => e.key === "Enter" && connected && handleCreateRoom()}
                disabled={!connected}
                className="border-primary/20 focus:border-primary/50 bg-background/50"
              />
            </div>

            <div className="space-y-3">
              <label htmlFor="betAmount" className="text-sm font-medium text-card-foreground flex items-center gap-2">
                <Coins className="h-4 w-4" />
                Bet Amount (SUI)
              </label>
              <Input
                id="betAmount"
                type="number"
                placeholder="0.1"
                value={betAmount}
                onChange={(e) => {
                  setBetAmount(e.target.value)
                  setError("")
                  setSuccess("")
                }}
                onKeyPress={(e) => e.key === "Enter" && connected && handleCreateRoom()}
                disabled={!connected}
                className="border-primary/20 focus:border-primary/50 bg-background/50"
                min="0"
                step="0.1"
              />
              <p className="text-xs text-muted-foreground">
                Enter the amount of SUI to bet for this game
              </p>
            </div>

            <Button
              onClick={handleCreateRoom}
              disabled={loading || !roomName.trim() || !betAmount.trim() || !connected}
              className="w-full bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg hover:shadow-xl transition-all duration-300 gap-2"
            >
              {loading ? (
                <>
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
                  Creating Bet & Room...
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4" />
                  Create Room
                </>
              )}
            </Button>

            {!connected && (
              <div className="text-center p-3 bg-muted/30 rounded-lg border border-muted/50">
                <p className="text-sm text-muted-foreground">Connect your SUI wallet to create a room</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="glass-card border-primary/20 shadow-xl">
          <CardHeader className="pb-4">
            <CardTitle className="text-center flex items-center justify-center gap-2 text-xl">
              <Hash className="h-5 w-5 text-accent" />
              Join Room by ID
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <label htmlFor="roomId" className="text-sm font-medium text-card-foreground">
                Room ID
              </label>
              <Input
                id="roomId"
                placeholder="Enter Room ID (e.g., ABC123)"
                value={roomId}
                onChange={(e) => {
                  setRoomId(e.target.value)
                  setError("")
                  setSuccess("")
                }}
                onKeyPress={(e) => e.key === "Enter" && connected && handleJoinRoom()}
                disabled={!connected}
                className="border-primary/20 focus:border-primary/50 bg-background/50"
              />
            </div>

            <div className="space-y-3">
              <label htmlFor="joinBetAmount" className="text-sm font-medium text-card-foreground flex items-center gap-2">
                <Coins className="h-4 w-4" />
                Bet Amount (SUI)
              </label>
              <Input
                id="joinBetAmount"
                type="number"
                placeholder="0.1"
                value={joinBetAmount}
                onChange={(e) => {
                  setJoinBetAmount(e.target.value)
                  setError("")
                  setSuccess("")
                }}
                onKeyPress={(e) => e.key === "Enter" && connected && handleJoinRoom()}
                disabled={!connected}
                className="border-primary/20 focus:border-primary/50 bg-background/50"
                min="0"
                step="0.1"
              />
              <p className="text-xs text-muted-foreground">
                Must match the room's bet amount
              </p>
            </div>

            <Button
              onClick={handleJoinRoom}
              disabled={loading || !roomId.trim() || !joinBetAmount.trim() || !connected}
              className="w-full bg-accent hover:bg-accent/90 text-accent-foreground shadow-lg hover:shadow-xl transition-all duration-300 gap-2"
            >
              {loading ? (
                <>
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-accent-foreground border-t-transparent" />
                  Joining...
                </>
              ) : (
                <>
                  <Hash className="h-4 w-4" />
                  Join Room
                </>
              )}
            </Button>

            {!connected && (
              <div className="text-center p-3 bg-muted/30 rounded-lg border border-muted/50">
                <p className="text-sm text-muted-foreground">Connect your SUI wallet to join a room</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="glass-card border-primary/20 shadow-xl">
        <CardHeader className="pb-4">
          <CardTitle className="text-center flex items-center justify-center gap-2 text-xl">
            <Users className="h-5 w-5 text-green-500" />
            Available Rooms
          </CardTitle>
        </CardHeader>
        <CardContent>
          {availableRooms.length === 0 ? (
            <div className="text-center py-8">
              <GamepadIcon className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" />
              <p className="text-muted-foreground">No rooms available. Create one to start playing!</p>
            </div>
          ) : (
            <div className="grid gap-3">
              {availableRooms.map((room) => (
                <div
                  key={room.id}
                  className="flex items-center justify-between p-4 border border-primary/10 rounded-lg bg-background/30 hover:bg-background/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div>
                      <h3 className="font-medium text-foreground">{room.name}</h3>
                      <p className="text-sm text-muted-foreground">Room ID: {room.id}</p>
                      {room.betAmount && (
                        <p className="text-sm text-accent font-medium flex items-center gap-1">
                          <Coins className="h-3 w-3" />
                          Bet: {room.betAmount} SUI
                        </p>
                      )}
                    </div>
                    <div className="flex flex-col gap-1">
                      <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/20">
                        {room.players.length}/2 players
                      </Badge>
                      {room.treasuryId && (
                        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 text-xs">
                          Contract Betting
                        </Badge>
                      )}
                    </div>
                  </div>
                  <Button
                    onClick={() => handleJoinAvailableRoom(room)}
                    disabled={loading || !connected}
                    size="sm"
                    className="bg-green-600 hover:bg-green-700 text-white"
                  >
                    {loading ? "Joining..." : "Join Room"}
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <WalletConnectPopup open={showWalletPopup} onOpenChange={setShowWalletPopup} />
    </div>
  )
}
