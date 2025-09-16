"use client"

import { useState } from "react"
import { useWallet } from "@suiet/wallet-kit"
import { SimpleGameLobby } from "@/components/simple-game-lobby"
import { SimpleGameRoom } from "@/components/simple-game-room"
import { RoomCreationScreen } from "@/components/room-creation-screen"
import type { GameRoom } from "@/lib/game-store"

export default function HomePage() {
  const { connected } = useWallet()
  const [currentRoom, setCurrentRoom] = useState<GameRoom | null>(null)
  const [showLobby, setShowLobby] = useState(false)

  const handleRoomCreated = (room: GameRoom) => {
    console.log("[v0] Room created:", room)
    setCurrentRoom(room)
  }

  const handleRoomJoined = (room: GameRoom) => {
    console.log("[v0] Room joined:", room)
    setCurrentRoom(room)
  }

  const handleLeaveRoom = () => {
    console.log("[v0] Leaving room")
    setCurrentRoom(null)
    setShowLobby(false)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      <div className="container mx-auto px-4 py-8">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-primary mb-2">SUI Tic-Tac-Toe</h1>
          <p className="text-muted-foreground">Play multiplayer tic-tac-toe on the SUI blockchain</p>
        </div>

        <div className="max-w-4xl mx-auto">
          {currentRoom ? (
            <SimpleGameRoom initialRoom={currentRoom} onLeaveRoom={handleLeaveRoom} />
          ) : showLobby ? (
            <SimpleGameLobby onRoomJoined={handleRoomJoined} />
          ) : (
            <div className="flex flex-col items-center space-y-8">
              <RoomCreationScreen onRoomCreated={handleRoomCreated} />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
