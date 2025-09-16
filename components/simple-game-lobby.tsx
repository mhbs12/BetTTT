"use client"

import { useState, useEffect, useRef } from "react"
import { useWallet } from "@suiet/wallet-kit"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { createRoom, joinRoom, getAvailableRooms } from "@/app/actions/game-actions"
import type { GameRoom } from "@/lib/game-store"

interface SimpleGameLobbyProps {
  onRoomJoined: (room: GameRoom) => void
}

export function SimpleGameLobby({ onRoomJoined }: SimpleGameLobbyProps) {
  const { account } = useWallet()
  const [roomName, setRoomName] = useState("")
  const [joinRoomId, setJoinRoomId] = useState("")
  const [availableRooms, setAvailableRooms] = useState<GameRoom[]>([])
  const [loading, setLoading] = useState(false)
  const [connectionStatus, setConnectionStatus] = useState<"connected" | "reconnecting" | "error">("connected")
  const [retryCount, setRetryCount] = useState(0)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const maxRetries = 3

  useEffect(() => {
    const fetchRooms = async () => {
      try {
        console.log("[v0] Fetching available rooms...")
        const result = await getAvailableRooms()
        if (result.success) {
          setAvailableRooms(result.rooms || [])
          setConnectionStatus("connected")
          setRetryCount(0)
          console.log("[v0] Successfully fetched rooms:", result.rooms?.length || 0)
        } else {
          throw new Error(result.error || "Failed to fetch rooms")
        }
      } catch (error) {
        console.error("[v0] Error fetching rooms:", error)
        setConnectionStatus("error")
        setRetryCount((prev) => prev + 1)

        if (retryCount < maxRetries) {
          setConnectionStatus("reconnecting")
          const backoffDelay = Math.min(1000 * Math.pow(2, retryCount), 10000)
          setTimeout(() => {
            setConnectionStatus("connected")
          }, backoffDelay)
        }
      }
    }

    fetchRooms()
    intervalRef.current = setInterval(fetchRooms, 3000)

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [retryCount])

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
        onRoomJoined(result.room)
      } else {
        console.error("[v0] Failed to create room:", result.error)
        alert(result.error || "Failed to create room. Please try again.")
      }
    } catch (error) {
      console.error("[v0] Error creating room:", error)
      alert("Network error. Please check your connection and try again.")
    } finally {
      setLoading(false)
    }
  }

  const handleJoinRoomById = async () => {
    if (!account?.address || !joinRoomId.trim()) {
      console.log("[v0] Cannot join room: missing account or room ID")
      return
    }

    console.log("[v0] Joining room by ID:", joinRoomId)
    setLoading(true)

    try {
      const playerName = `${account.address.slice(0, 6)}...${account.address.slice(-4)}`
      const result = await joinRoom(joinRoomId.trim().toUpperCase(), account.address, playerName)

      if (result.success && result.room) {
        console.log("[v0] Joined room successfully:", result.room)
        onRoomJoined(result.room)
      } else {
        console.error("[v0] Failed to join room:", result.error)
        alert(result.error || "Failed to join room. Please check the Room ID.")
      }
    } catch (error) {
      console.error("[v0] Error joining room:", error)
      alert("Network error. Please check your connection and try again.")
    } finally {
      setLoading(false)
    }
  }

  const handleJoinRoom = async (room: GameRoom) => {
    if (!account?.address) {
      console.log("[v0] Cannot join room: no account")
      return
    }

    console.log("[v0] Joining room:", room.id)
    setLoading(true)

    try {
      const playerName = `${account.address.slice(0, 6)}...${account.address.slice(-4)}`
      const result = await joinRoom(room.id, account.address, playerName)

      if (result.success && result.room) {
        console.log("[v0] Joined room successfully:", result.room)
        onRoomJoined(result.room)
      } else {
        console.error("[v0] Failed to join room:", result.error)
        alert(result.error || "Failed to join room. It may be full or no longer available.")
      }
    } catch (error) {
      console.error("[v0] Error joining room:", error)
      alert("Network error. Please check your connection and try again.")
    } finally {
      setLoading(false)
    }
  }

  if (!account?.address) {
    return (
      <Card className="w-full max-w-md mx-auto">
        <CardHeader>
          <CardTitle className="text-center">Connect Wallet</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-center text-muted-foreground">Please connect your SUI wallet to play</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6">
      {connectionStatus !== "connected" && (
        <Card className="border-yellow-200 bg-yellow-50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse"></div>
              <p className="text-sm text-yellow-700">
                {connectionStatus === "reconnecting" ? "Reconnecting..." : "Connection issues detected. Retrying..."}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Create Room Section */}
      <Card>
        <CardHeader>
          <CardTitle>Create New Room</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input
              placeholder="Enter room name"
              value={roomName}
              onChange={(e) => setRoomName(e.target.value)}
              onKeyPress={(e) => e.key === "Enter" && handleCreateRoom()}
            />
            <Button onClick={handleCreateRoom} disabled={loading || !roomName.trim()}>
              {loading ? "Creating..." : "Create Room"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Join Room by ID Section */}
      <Card>
        <CardHeader>
          <CardTitle>Join Room by ID</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input
              placeholder="Enter Room ID (e.g., ABC123)"
              value={joinRoomId}
              onChange={(e) => setJoinRoomId(e.target.value.toUpperCase())}
              onKeyPress={(e) => e.key === "Enter" && handleJoinRoomById()}
              maxLength={6}
            />
            <Button onClick={handleJoinRoomById} disabled={loading || !joinRoomId.trim()}>
              {loading ? "Joining..." : "Join Room"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Available Rooms Section */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Available Rooms</CardTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setRetryCount((prev) => prev + 1)}
              disabled={connectionStatus === "reconnecting"}
            >
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {availableRooms.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">No rooms available. Create one to start playing!</p>
          ) : (
            <div className="grid gap-3">
              {availableRooms.map((room) => (
                <div key={room.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <div>
                      <h3 className="font-medium">{room.name}</h3>
                      <p className="text-sm text-muted-foreground">Room ID: {room.id}</p>
                    </div>
                    <Badge variant="secondary">{room.players.length}/2 players</Badge>
                  </div>
                  <Button onClick={() => handleJoinRoom(room)} disabled={loading} size="sm">
                    Join Room
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
