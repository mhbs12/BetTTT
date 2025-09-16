"use client"

import { useState, useEffect } from "react"
import { useWallet } from "@suiet/wallet-kit"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { WalletConnectPopup } from "@/components/wallet-connect-popup"
import { createRoom, joinRoom, getAvailableRooms } from "@/app/actions/game-actions"
import { Plus, Hash, Sparkles, GamepadIcon, Users } from "lucide-react"
import type { GameRoom } from "@/lib/game-store"

interface RoomCreationScreenProps {
  onRoomCreated: (room: GameRoom) => void
}

export function RoomCreationScreen({ onRoomCreated }: RoomCreationScreenProps) {
  const { connected, account } = useWallet()
  const [roomName, setRoomName] = useState("")
  const [roomId, setRoomId] = useState("")
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

    console.log("[v0] Creating room with name:", roomName)
    setLoading(true)

    try {
      const playerName = `${account.address.slice(0, 6)}...${account.address.slice(-4)}`
      const result = await createRoom(roomName.trim(), account.address, playerName)

      if (result.success && result.room) {
        console.log("[v0] Room created successfully:", result.room)
        onRoomCreated(result.room)
      } else {
        console.error("[v0] Failed to create room:", result.error)
      }
    } catch (error) {
      console.error("[v0] Error creating room:", error)
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
      const result = await joinRoom(roomId.trim().toUpperCase(), account.address, playerName)

      if (result.success && result.room) {
        console.log("[v0] Room joined successfully:", result.room)
        onRoomCreated(result.room)
      } else {
        console.error("[v0] Failed to join room:", result.error)
      }
    } catch (error) {
      console.error("[v0] Error joining room:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleJoinAvailableRoom = async (room: GameRoom) => {
    if (!account?.address) {
      console.log("[v0] Cannot join room: no account")
      return
    }

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
      }
    } catch (error) {
      console.error("[v0] Error joining room:", error)
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

            <Button
              onClick={handleCreateRoom}
              disabled={loading || !roomName.trim() || !connected}
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
                    </div>
                    <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/20">
                      {room.players.length}/2 players
                    </Badge>
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
