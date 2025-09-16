"use client"

import { useState, useEffect } from "react"
import { useWallet } from "@suiet/wallet-kit"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, RotateCcw, Trophy, Users, Copy, Check, Wifi, WifiOff } from "lucide-react"
import { realtimeRoomManager } from "@/lib/realtime-room-manager"
import type { Room, GameState } from "@/types/game"
import { RealtimeTicTacToeBoard } from "@/components/realtime-tic-tac-toe-board"

interface RealtimeGameRoomProps {
  room: Room
  onLeave: () => void
}

export function RealtimeGameRoom({ room: initialRoom, onLeave }: RealtimeGameRoomProps) {
  const { account } = useWallet()
  const [room, setRoom] = useState<Room>(initialRoom)
  const [gameState, setGameState] = useState<GameState | null>(null)
  const [gameResult, setGameResult] = useState<{ winner: any; isDraw: boolean } | null>(null)
  const [copied, setCopied] = useState(false)
  const [isConnected, setIsConnected] = useState(true)

  useEffect(() => {
    // Subscribe to room updates
    const unsubscribeRoom = realtimeRoomManager.subscribeToRoom((updatedRoom) => {
      if (updatedRoom) {
        setRoom(updatedRoom)
      }
    })

    // Subscribe to game state updates
    const unsubscribeGame = realtimeRoomManager.subscribeToGame(setGameState)

    // Subscribe to game finish events
    const unsubscribeFinish = realtimeRoomManager.onGameFinish(setGameResult)

    return () => {
      unsubscribeRoom()
      unsubscribeGame()
      unsubscribeFinish()
    }
  }, [])

  const handleMove = (position: number) => {
    if (!account?.address) return
    realtimeRoomManager.makeMove(room.id, account.address, position)
  }

  const handleResetGame = () => {
    realtimeRoomManager.resetGame(room.id)
    setGameResult(null)
  }

  const handleCopyRoomId = async () => {
    try {
      await navigator.clipboard.writeText(room.id)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error("Failed to copy room ID:", err)
    }
  }

  const currentPlayer = room.players.find((p) => p.walletAddress === account?.address)
  const opponent = room.players.find((p) => p.walletAddress !== account?.address)

  const getWinnerInfo = () => {
    if (gameResult?.winner) {
      return gameResult.winner
    }
    if (gameState?.winner) {
      return room.players.find((p) => p.symbol === gameState.winner)
    }
    return null
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
                <Badge variant="secondary" className="cursor-pointer" onClick={handleCopyRoomId}>
                  {copied ? <Check className="h-3 w-3 mr-1" /> : <Copy className="h-3 w-3 mr-1" />}
                  {room.id}
                </Badge>
              </CardTitle>
              <CardDescription className="flex items-center gap-2">
                {isConnected ? (
                  <Wifi className="h-4 w-4 text-green-500" />
                ) : (
                  <WifiOff className="h-4 w-4 text-red-500" />
                )}
                {room.players.length}/{room.maxPlayers} players • {isConnected ? "Connected" : "Disconnected"}
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
            <div className="flex items-center gap-6">
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

            {(gameState?.gameStatus === "finished" || gameResult) && (
              <Button onClick={handleResetGame} variant="outline">
                <RotateCcw className="h-4 w-4 mr-2" />
                New Game
              </Button>
            )}
          </div>

          {/* Game Status Messages */}
          {room.players.length < 2 && (
            <div className="text-center py-6 space-y-2">
              <Users className="h-8 w-8 mx-auto text-muted-foreground" />
              <p className="text-muted-foreground">Waiting for another player to join...</p>
              <p className="text-sm text-muted-foreground">Share room ID: {room.id}</p>
            </div>
          )}

          {gameState?.gameStatus === "playing" && room.players.length === 2 && (
            <div className="text-center py-2">
              <p className="text-sm text-muted-foreground">
                {gameState.currentPlayer === account?.address ? (
                  <span className="text-primary font-medium">Your turn</span>
                ) : (
                  <span>Opponent's turn</span>
                )}
              </p>
            </div>
          )}

          {(gameState?.gameStatus === "finished" || gameResult) && (
            <div className="text-center py-6 space-y-3">
              {winnerInfo ? (
                <div className="space-y-2">
                  <div className="flex items-center justify-center gap-2 text-xl font-bold">
                    <Trophy className="h-6 w-6 text-yellow-500" />
                    {winnerInfo.walletAddress === account?.address ? (
                      <span className="text-green-600">You Won!</span>
                    ) : (
                      <span className="text-red-600">{winnerInfo.name} Won!</span>
                    )}
                  </div>
                  <Card className="bg-muted/50 p-4 max-w-md mx-auto">
                    <p className="text-sm text-muted-foreground mb-1">Winner's Wallet Address:</p>
                    <p className="font-mono text-sm break-all">{winnerInfo.walletAddress}</p>
                  </Card>
                </div>
              ) : (
                <div className="flex items-center justify-center gap-2 text-xl font-bold text-yellow-600">
                  <Trophy className="h-6 w-6" />
                  It's a Draw!
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Game Board */}
      {room.players.length === 2 && gameState && (
        <RealtimeTicTacToeBoard
          gameState={gameState}
          onMove={handleMove}
          currentPlayerAddress={account?.address || ""}
          disabled={gameState.gameStatus !== "playing" || gameState.currentPlayer !== account?.address || !isConnected}
        />
      )}
    </div>
  )
}
