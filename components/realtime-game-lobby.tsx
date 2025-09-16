"use client"

import { useState, useEffect } from "react"
import { useWallet } from "@suiet/wallet-kit"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Plus, Gamepad2 } from "lucide-react"
import { realtimeRoomManager } from "@/lib/realtime-room-manager"
import type { Room } from "@/types/game"
import { RealtimeGameRoom } from "@/components/realtime-game-room"

export function RealtimeGameLobby() {
  const { account } = useWallet()
  const [currentRoom, setCurrentRoom] = useState<Room | null>(null)
  const [newRoomName, setNewRoomName] = useState("")
  const [joinRoomId, setJoinRoomId] = useState("")
  const [isCreating, setIsCreating] = useState(false)

  useEffect(() => {
    const unsubscribe = realtimeRoomManager.subscribeToRoom(setCurrentRoom)
    return unsubscribe
  }, [])

  const handleCreateRoom = () => {
    console.log("[v0] handleCreateRoom called")
    console.log("[v0] account:", account)
    console.log("[v0] newRoomName:", newRoomName)

    if (!account?.address) {
      console.log("[v0] No account address available")
      return
    }

    if (!newRoomName.trim()) {
      console.log("[v0] Room name is empty")
      return
    }

    console.log("[v0] Creating room with address:", account.address, "name:", newRoomName.trim())
    setIsCreating(true)

    try {
      const roomId = realtimeRoomManager.createRoom(account.address, newRoomName.trim())
      console.log("[v0] Room created with ID:", roomId)
      setNewRoomName("")
    } catch (error) {
      console.error("[v0] Error creating room:", error)
    } finally {
      setIsCreating(false)
    }
  }

  const handleJoinRoom = (roomId: string) => {
    if (!account?.address) return
    console.log("[v0] Joining room:", roomId, "with address:", account.address)
    realtimeRoomManager.joinRoom(roomId, account.address)
  }

  const handleJoinRoomById = () => {
    if (!joinRoomId.trim()) return
    handleJoinRoom(joinRoomId.trim().toUpperCase())
    setJoinRoomId("")
  }

  const handleLeaveRoom = () => {
    if (!currentRoom || !account?.address) return
    realtimeRoomManager.leaveRoom(currentRoom.id, account.address)
  }

  if (currentRoom) {
    return <RealtimeGameRoom room={currentRoom} onLeave={handleLeaveRoom} />
  }

  return (
    <div className="w-full max-w-4xl space-y-6">
      {/* Hero Section */}
      <Card className="bg-gradient-to-r from-primary/10 to-accent/10 border-primary/20">
        <CardContent className="pt-6">
          <div className="text-center space-y-4">
            <div className="flex justify-center">
              <Gamepad2 className="h-16 w-16 text-primary" />
            </div>
            <h2 className="text-2xl font-bold">Ready to Play?</h2>
            <p className="text-muted-foreground">
              Create a room or join an existing one to start playing tic-tac-toe on the SUI blockchain
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Create Room Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            Create New Room
          </CardTitle>
          <CardDescription>Start a new game and wait for an opponent to join</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <Input
              placeholder="Enter room name (e.g., 'Epic Battle')"
              value={newRoomName}
              onChange={(e) => setNewRoomName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleCreateRoom()}
              className="flex-1"
            />
            <Button onClick={handleCreateRoom} disabled={!newRoomName.trim() || isCreating} className="min-w-[120px]">
              {isCreating ? "Creating..." : "Create Room"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Join Room by ID */}
      <Card>
        <CardHeader>
          <CardTitle>Join Room by ID</CardTitle>
          <CardDescription>Have a room ID? Enter it below to join directly</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <Input
              placeholder="Room ID (e.g., ABC123)"
              value={joinRoomId}
              onChange={(e) => setJoinRoomId(e.target.value.toUpperCase())}
              onKeyDown={(e) => e.key === "Enter" && handleJoinRoomById()}
              className="flex-1"
              maxLength={6}
            />
            <Button onClick={handleJoinRoomById} disabled={!joinRoomId.trim()} className="min-w-[120px]">
              Join Room
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Instructions */}
      <Card>
        <CardHeader>
          <CardTitle>How to Play</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-3 gap-4 text-sm">
            <div className="text-center space-y-2">
              <div className="w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center mx-auto font-bold">
                1
              </div>
              <p className="font-medium">Connect Wallet</p>
              <p className="text-muted-foreground">Connect your SUI wallet to authenticate</p>
            </div>
            <div className="text-center space-y-2">
              <div className="w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center mx-auto font-bold">
                2
              </div>
              <p className="font-medium">Create or Join</p>
              <p className="text-muted-foreground">Create a new room or join an existing one</p>
            </div>
            <div className="text-center space-y-2">
              <div className="w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center mx-auto font-bold">
                3
              </div>
              <p className="font-medium">Play & Win</p>
              <p className="text-muted-foreground">Play tic-tac-toe and see the winner's wallet address</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
