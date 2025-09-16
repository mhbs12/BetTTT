"use client"

import { useState, useEffect } from "react"
import { useWallet } from "@mysten/wallet-adapter-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, RotateCcw, Trophy, Users } from "lucide-react"
import { enhancedRoomManager } from "@/lib/enhanced-room-manager"
import type { Room, GameState } from "@/types/game"
import { TicTacToeBoard } from "@/components/tic-tac-toe-board"

interface GameRoomProps {
  room: Room
  onLeave: () => void
}

export function GameRoom({ room: initialRoom, onLeave }: GameRoomProps) {
  const { account } = useWallet()
  const [room, setRoom] = useState<Room>(initialRoom)
  const [gameState, setGameState] = useState<GameState | null>(null)

  useEffect(() => {
    // Subscribe to game state updates
    const unsubscribeGame = enhancedRoomManager.subscribeToGame(room.id, setGameState)

    // Get initial game state
    const initialGameState = enhancedRoomManager.getGameState(room.id)
    if (initialGameState) {
      setGameState(initialGameState)
    }

    // Subscribe to room updates
    const unsubscribeRooms = enhancedRoomManager.subscribeToRooms(() => {
      const updatedRoom = enhancedRoomManager.getRoom(room.id)
      if (updatedRoom) {
        setRoom(updatedRoom)
      }
    })

    return () => {
      unsubscribeGame()
      unsubscribeRooms()
    }
  }, [room.id])

  const handleMove = (position: number) => {
    if (!account?.address) return
    enhancedRoomManager.makeMove(room.id, account.address, position)
  }

  const handleResetGame = () => {
    enhancedRoomManager.resetGame(room.id)
  }

  const currentPlayer = room.players.find((p) => p.walletAddress === account?.address)
  const opponent = room.players.find((p) => p.walletAddress !== account?.address)

  const getWinnerInfo = () => {
    if (!gameState?.winner) return null

    const winnerPlayer = room.players.find((p) => p.symbol === gameState.winner)
    return winnerPlayer
  }

  const winnerInfo = getWinnerInfo()

  return (
    <div className="w-full max-w-4xl space-y-6">
      {/* Room Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                {room.name}
                <Badge variant="secondary">ID: {room.id}</Badge>
              </CardTitle>
              <CardDescription>
                {room.players.length}/{room.maxPlayers} players
              </CardDescription>
            </div>
            <Button variant="outline" onClick={onLeave}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Leave Room
            </Button>
          </div>
        </CardHeader>
      </Card>

      {/* Game Status */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-4">
              <div className="text-center">
                <p className="text-sm text-muted-foreground">You</p>
                <p className="font-medium">{currentPlayer?.name}</p>
                <Badge variant={currentPlayer?.symbol === "X" ? "default" : "secondary"}>{currentPlayer?.symbol}</Badge>
              </div>
              <div className="text-2xl font-bold text-muted-foreground">VS</div>
              <div className="text-center">
                <p className="text-sm text-muted-foreground">Opponent</p>
                <p className="font-medium">{opponent?.name || "Waiting..."}</p>
                {opponent && (
                  <Badge variant={opponent.symbol === "X" ? "default" : "secondary"}>{opponent.symbol}</Badge>
                )}
              </div>
            </div>

            {gameState?.gameStatus === "finished" && (
              <Button onClick={handleResetGame} variant="outline">
                <RotateCcw className="h-4 w-4 mr-2" />
                New Game
              </Button>
            )}
          </div>

          {/* Game Status Messages */}
          {room.players.length < 2 && (
            <div className="text-center py-4">
              <p className="text-muted-foreground">Waiting for another player to join...</p>
            </div>
          )}

          {gameState?.gameStatus === "playing" && (
            <div className="text-center py-2">
              <p className="text-sm text-muted-foreground">
                {gameState.currentPlayer === account?.address ? "Your turn" : "Opponent's turn"}
              </p>
            </div>
          )}

          {gameState?.gameStatus === "finished" && (
            <div className="text-center py-4">
              {winnerInfo ? (
                <div className="flex items-center justify-center gap-2 text-lg font-semibold">
                  <Trophy className="h-5 w-5 text-yellow-500" />
                  {winnerInfo.walletAddress === account?.address ? "You Won!" : `${winnerInfo.name} Won!`}
                </div>
              ) : (
                <p className="text-lg font-semibold">It's a Draw!</p>
              )}
              {winnerInfo && <p className="text-sm text-muted-foreground mt-2">Winner: {winnerInfo.walletAddress}</p>}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Game Board */}
      {room.players.length === 2 && gameState && (
        <TicTacToeBoard
          gameState={gameState}
          onMove={handleMove}
          currentPlayerAddress={account?.address || ""}
          disabled={gameState.gameStatus !== "playing" || gameState.currentPlayer !== account?.address}
        />
      )}
    </div>
  )
}
