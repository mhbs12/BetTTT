"use client"

import { useState, useEffect } from "react"
import { useWallet } from "@mysten/wallet-adapter-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Plus, Users, Play, RefreshCw } from "lucide-react"
import { enhancedRoomManager } from "@/lib/enhanced-room-manager"
import type { Room } from "@/types/game"
import { GameRoom } from "@/components/game-room"

export function GameLobby() {
  const { account } = useWallet()
  const [rooms, setRooms] = useState<Room[]>([])
  const [currentRoom, setCurrentRoom] = useState<Room | null>(null)
  const [newRoomName, setNewRoomName] = useState("")
  const [joinRoomId, setJoinRoomId] = useState("")
  const [isCreating, setIsCreating] = useState(false)

  useEffect(() => {
    const unsubscribe = enhancedRoomManager.subscribeToRooms(setRooms)
    setRooms(enhancedRoomManager.getRooms())
    return unsubscribe
  }, [])

  const handleCreateRoom = () => {
    if (!account?.address || !newRoomName.trim()) return

    setIsCreating(true)
    const room = enhancedRoomManager.createRoom(account.address, newRoomName.trim())
    setCurrentRoom(room)
    setNewRoomName("")
    setIsCreating(false)
  }

  const handleJoinRoom = (roomId: string) => {
    if (!account?.address) return

    const room = enhancedRoomManager.joinRoom(roomId, account.address)
    if (room) {
      setCurrentRoom(room)
    }
  }

  const handleJoinRoomById = () => {
    if (!joinRoomId.trim()) return
    handleJoinRoom(joinRoomId.trim().toUpperCase())
    setJoinRoomId("")
  }

  const handleLeaveRoom = () => {
    if (!currentRoom || !account?.address) return
    enhancedRoomManager.leaveRoom(currentRoom.id, account.address)
    setCurrentRoom(null)
  }

  if (currentRoom) {
    return <GameRoom room={currentRoom} onLeave={handleLeaveRoom} />
  }

  return (
    <div className="w-full max-w-4xl space-y-6">
      {/* Create Room Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            Create New Room
          </CardTitle>
          <CardDescription>Start a new game and wait for an opponent</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <Input
              placeholder="Room name"
              value={newRoomName}
              onChange={(e) => setNewRoomName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleCreateRoom()}
              className="flex-1"
            />
            <Button onClick={handleCreateRoom} disabled={!newRoomName.trim() || isCreating}>
              {isCreating ? "Creating..." : "Create Room"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Join Room by ID */}
      <Card>
        <CardHeader>
          <CardTitle>Join Room by ID</CardTitle>
          <CardDescription>Enter a room ID to join directly</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <Input
              placeholder="Room ID (e.g., ABC123)"
              value={joinRoomId}
              onChange={(e) => setJoinRoomId(e.target.value.toUpperCase())}
              onKeyDown={(e) => e.key === "Enter" && handleJoinRoomById()}
              className="flex-1"
            />
            <Button onClick={handleJoinRoomById} disabled={!joinRoomId.trim()}>
              Join Room
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Available Rooms */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Available Rooms
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setRooms(enhancedRoomManager.getRooms())}
              className="ml-auto"
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
          </CardTitle>
          <CardDescription>Join an existing room</CardDescription>
        </CardHeader>
        <CardContent>
          {rooms.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No rooms available. Create one to get started!</p>
            </div>
          ) : (
            <div className="grid gap-3">
              {rooms.map((room) => (
                <div
                  key={room.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-medium">{room.name}</h3>
                      <Badge variant="secondary">ID: {room.id}</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {room.players.length}/{room.maxPlayers} players
                    </p>
                  </div>
                  <Button onClick={() => handleJoinRoom(room.id)} size="sm">
                    <Play className="h-4 w-4 mr-2" />
                    Join
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
