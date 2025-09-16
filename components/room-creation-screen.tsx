"use client"

import { useState, useEffect } from "react"
import { useWallet } from "@suiet/wallet-kit"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { WalletConnectPopup } from "@/components/wallet-connect-popup"
import { createRoom, joinRoom, getAvailableRooms, updateRoomTreasuryId } from "@/app/actions/game-actions"
import { createBetTransaction, joinBetTransaction, suiToMist } from "@/lib/sui-transactions"
import { suiClient } from "@/lib/sui-client"
import { Plus, Hash, Sparkles, GamepadIcon, Users, Coins } from "lucide-react"
import type { GameRoom } from "@/lib/game-store"

interface RoomCreationScreenProps {
  onRoomCreated: (room: GameRoom) => void
}

export function RoomCreationScreen({ onRoomCreated }: RoomCreationScreenProps) {
  const { connected, account, signAndExecuteTransaction } = useWallet()
  const [roomName, setRoomName] = useState("")
  const [roomId, setRoomId] = useState("")
  const [createBetAmount, setCreateBetAmount] = useState("")
  const [joinBetAmount, setJoinBetAmount] = useState("")
  const [activeTab, setActiveTab] = useState<"create" | "join">("create")
  const [loading, setLoading] = useState(false)
  const [showWalletPopup, setShowWalletPopup] = useState(false)
  const [availableRooms, setAvailableRooms] = useState<GameRoom[]>([])

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

  const handleCreateRoom = async () => {
    if (!account?.address || !roomName.trim()) {
      console.log("[v0] Cannot create room: missing account or room name")
      return
    }

    if (!createBetAmount.trim() || parseFloat(createBetAmount) <= 0) {
      alert("Please enter a valid bet amount")
      return
    }

    console.log("[v0] Creating room with name:", roomName, "bet amount:", createBetAmount)
    setLoading(true)

    try {
      const playerName = `${account.address.slice(0, 6)}...${account.address.slice(-4)}`

      // If bet amount is provided, execute blockchain transaction first
      if (createBetAmount && parseFloat(createBetAmount) > 0) {
        // Get the user's SUI coins
        const coins = await suiClient.getCoins({
          owner: account.address,
          coinType: "0x2::sui::SUI",
        })

        if (coins.data.length === 0) {
          alert("No SUI coins found in your wallet")
          return
        }

        // Use the first coin that has enough balance
        const betAmountMist = suiToMist(createBetAmount)
        const suitableCoin = coins.data.find(coin => 
          parseInt(coin.balance) >= parseInt(betAmountMist)
        )

        if (!suitableCoin) {
          alert(`Insufficient SUI balance. Need at least ${createBetAmount} SUI`)
          return
        }

        // Create the blockchain transaction
        const transaction = createBetTransaction(suitableCoin.coinObjectId, betAmountMist)

        try {
          // Execute the transaction
          const result = await signAndExecuteTransaction({
            transaction: transaction,
            options: {
              showInput: true,
              showEffects: true,
              showEvents: true,
              showObjectChanges: true,
            },
          })

          console.log("[v0] Blockchain transaction successful:", result)

          // Extract treasury ID from transaction results
          let treasuryId = ""
          if (result.objectChanges) {
            const sharedObject = result.objectChanges.find(
              change => change.type === "created" && 
              change.objectType?.includes("Treasury")
            )
            if (sharedObject && "objectId" in sharedObject) {
              treasuryId = sharedObject.objectId
            }
          }

          // Create room with bet amount and treasury ID
          const roomResult = await createRoom(roomName.trim(), account.address, playerName, createBetAmount, treasuryId)

          if (roomResult.success && roomResult.room) {
            console.log("[v0] Room created successfully:", roomResult.room)
            onRoomCreated(roomResult.room)
          } else {
            console.error("[v0] Failed to create room:", roomResult.error)
            alert(roomResult.error || "Failed to create room")
          }

        } catch (blockchainError) {
          console.error("[v0] Blockchain transaction failed:", blockchainError)
          alert("Blockchain transaction failed. Please try again.")
        }
      } else {
        // Create room without betting
        const result = await createRoom(roomName.trim(), account.address, playerName)

        if (result.success && result.room) {
          console.log("[v0] Room created successfully:", result.room)
          onRoomCreated(result.room)
        } else {
          console.error("[v0] Failed to create room:", result.error)
          alert(result.error || "Failed to create room")
        }
      }
    } catch (error) {
      console.error("[v0] Error creating room:", error)
      alert("Error creating room. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  const handleJoinRoom = async () => {
    if (!account?.address || !roomId.trim()) {
      console.log("[v0] Cannot join room: missing account or room ID")
      return
    }

    console.log("[v0] Joining room with ID:", roomId)
    setLoading(true)

    try {
      const playerName = `${account.address.slice(0, 6)}...${account.address.slice(-4)}`
      
      // First, try to get room info to check if it has betting
      const targetRoom = availableRooms.find(room => room.id === roomId.trim().toUpperCase())
      
      if (targetRoom?.betAmount && targetRoom.treasuryId) {
        // Room has betting, check if join amount matches
        if (!joinBetAmount.trim() || parseFloat(joinBetAmount) !== parseFloat(targetRoom.betAmount)) {
          alert(`This room requires a bet of exactly ${targetRoom.betAmount} SUI`)
          return
        }

        // Get the user's SUI coins
        const coins = await suiClient.getCoins({
          owner: account.address,
          coinType: "0x2::sui::SUI",
        })

        if (coins.data.length === 0) {
          alert("No SUI coins found in your wallet")
          return
        }

        // Use the first coin that has enough balance
        const betAmountMist = suiToMist(joinBetAmount)
        const suitableCoin = coins.data.find(coin => 
          parseInt(coin.balance) >= parseInt(betAmountMist)
        )

        if (!suitableCoin) {
          alert(`Insufficient SUI balance. Need at least ${joinBetAmount} SUI`)
          return
        }

        // Create the blockchain transaction for joining the bet
        const transaction = joinBetTransaction(targetRoom.treasuryId, suitableCoin.coinObjectId, betAmountMist)

        try {
          // Execute the transaction
          const result = await signAndExecuteTransaction({
            transaction: transaction,
            options: {
              showInput: true,
              showEffects: true,
              showEvents: true,
              showObjectChanges: true,
            },
          })

          console.log("[v0] Join bet transaction successful:", result)

          // Now join the room
          const joinResult = await joinRoom(roomId.trim().toUpperCase(), account.address, playerName)

          if (joinResult.success && joinResult.room) {
            console.log("[v0] Room joined successfully:", joinResult.room)
            onRoomCreated(joinResult.room)
          } else {
            console.error("[v0] Failed to join room:", joinResult.error)
            alert(joinResult.error || "Failed to join room")
          }

        } catch (blockchainError) {
          console.error("[v0] Blockchain transaction failed:", blockchainError)
          alert("Blockchain transaction failed. Please try again.")
        }
      } else {
        // Room doesn't have betting, join normally
        const result = await joinRoom(roomId.trim().toUpperCase(), account.address, playerName)

        if (result.success && result.room) {
          console.log("[v0] Room joined successfully:", result.room)
          onRoomCreated(result.room)
        } else {
          console.error("[v0] Failed to join room:", result.error)
          alert(result.error || "Failed to join room")
        }
      }
    } catch (error) {
      console.error("[v0] Error joining room:", error)
      alert("Error joining room. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  const handleJoinAvailableRoom = async (room: GameRoom) => {
    if (!account?.address) {
      console.log("[v0] Cannot join room: no account")
      return
    }

    // If room has betting, show alert for bet amount requirement
    if (room.betAmount && room.treasuryId) {
      const confirmJoin = confirm(`This room requires a bet of ${room.betAmount} SUI. Do you want to continue?`)
      if (!confirmJoin) return

      console.log("[v0] Joining betting room:", room.id)
      setLoading(true)

      try {
        const playerName = `${account.address.slice(0, 6)}...${account.address.slice(-4)}`

        // Get the user's SUI coins
        const coins = await suiClient.getCoins({
          owner: account.address,
          coinType: "0x2::sui::SUI",
        })

        if (coins.data.length === 0) {
          alert("No SUI coins found in your wallet")
          return
        }

        // Use the first coin that has enough balance
        const betAmountMist = suiToMist(room.betAmount)
        const suitableCoin = coins.data.find(coin => 
          parseInt(coin.balance) >= parseInt(betAmountMist)
        )

        if (!suitableCoin) {
          alert(`Insufficient SUI balance. Need at least ${room.betAmount} SUI`)
          return
        }

        // Create the blockchain transaction for joining the bet
        const transaction = joinBetTransaction(room.treasuryId, suitableCoin.coinObjectId, betAmountMist)

        try {
          // Execute the transaction
          const result = await signAndExecuteTransaction({
            transaction: transaction,
            options: {
              showInput: true,
              showEffects: true,
              showEvents: true,
              showObjectChanges: true,
            },
          })

          console.log("[v0] Join bet transaction successful:", result)

          // Now join the room
          const joinResult = await joinRoom(room.id, account.address, playerName)

          if (joinResult.success && joinResult.room) {
            console.log("[v0] Joined room successfully:", joinResult.room)
            onRoomCreated(joinResult.room)
          } else {
            console.error("[v0] Failed to join room:", joinResult.error)
            alert(joinResult.error || "Failed to join room")
          }

        } catch (blockchainError) {
          console.error("[v0] Blockchain transaction failed:", blockchainError)
          alert("Blockchain transaction failed. Please try again.")
        }
      } catch (error) {
        console.error("[v0] Error joining room:", error)
        alert("Error joining room. Please try again.")
      } finally {
        setLoading(false)
      }
    } else {
      // Room doesn't have betting, join normally
      console.log("[v0] Joining available room:", room.id)
      setLoading(true)

      try {
        const playerName = `${account.address.slice(0, 6)}...${account.address.slice(-4)}`
        const result = await joinRoom(room.id, account.address, playerName)

        if (result.success && result.room) {
          console.log("[v0] Joined room successfully:", result.room)
          onRoomCreated(result.room)
        } else {
          console.error("[v0] Failed to join room:", result.error)
          alert(result.error || "Failed to join room")
        }
      } catch (error) {
        console.error("[v0] Error joining room:", error)
        alert("Error joining room. Please try again.")
      } finally {
        setLoading(false)
      }
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
                onChange={(e) => setRoomName(e.target.value)}
                onKeyPress={(e) => e.key === "Enter" && connected && handleCreateRoom()}
                disabled={!connected}
                className="border-primary/20 focus:border-primary/50 bg-background/50"
              />
            </div>

            <div className="space-y-3">
              <label htmlFor="createBetAmount" className="text-sm font-medium text-card-foreground flex items-center gap-2">
                <Coins className="h-4 w-4 text-primary" />
                Bet Amount (SUI)
              </label>
              <Input
                id="createBetAmount"
                type="number"
                step="0.1"
                min="0.1"
                placeholder="Enter bet amount (e.g., 1.0)"
                value={createBetAmount}
                onChange={(e) => setCreateBetAmount(e.target.value)}
                disabled={!connected}
                className="border-primary/20 focus:border-primary/50 bg-background/50"
              />
              <p className="text-xs text-muted-foreground">
                Both players must bet this amount to play
              </p>
            </div>

            <Button
              onClick={handleCreateRoom}
              disabled={loading || !roomName.trim() || !createBetAmount.trim() || !connected}
              className="w-full bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg hover:shadow-xl transition-all duration-300 gap-2"
            >
              {loading ? (
                <>
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
                  Creating...
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
                onChange={(e) => setRoomId(e.target.value)}
                onKeyPress={(e) => e.key === "Enter" && connected && handleJoinRoom()}
                disabled={!connected}
                className="border-primary/20 focus:border-primary/50 bg-background/50"
              />
            </div>

            <div className="space-y-3">
              <label htmlFor="joinBetAmount" className="text-sm font-medium text-card-foreground flex items-center gap-2">
                <Coins className="h-4 w-4 text-accent" />
                Bet Amount (SUI)
              </label>
              <Input
                id="joinBetAmount"
                type="number"
                step="0.1"
                min="0.1"
                placeholder="Enter bet amount (must match room)"
                value={joinBetAmount}
                onChange={(e) => setJoinBetAmount(e.target.value)}
                disabled={!connected}
                className="border-primary/20 focus:border-primary/50 bg-background/50"
              />
              <p className="text-xs text-muted-foreground">
                Must match the room's bet amount if it has betting
              </p>
            </div>

            <Button
              onClick={handleJoinRoom}
              disabled={loading || !roomId.trim() || !connected}
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
                        <p className="text-sm text-primary font-medium flex items-center gap-1">
                          <Coins className="h-3 w-3" />
                          Bet: {room.betAmount} SUI
                        </p>
                      )}
                    </div>
                    <div className="flex flex-col gap-1">
                      <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/20">
                        {room.players.length}/2 players
                      </Badge>
                      {room.betAmount && (
                        <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200 text-xs">
                          Betting Room
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
