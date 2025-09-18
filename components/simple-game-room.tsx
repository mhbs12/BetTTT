"use client"

import { useState, useEffect, useRef } from "react"
import { useWallet } from "@suiet/wallet-kit"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { makeMove, getRoomState, leaveRoom, checkGameForfeit } from "@/app/actions/game-actions"
import { finishGame } from "@/lib/sui-contract"
import type { GameRoom } from "@/lib/game-store"

interface SimpleGameRoomProps {
  initialRoom: GameRoom
  onLeaveRoom: () => void
}

export function SimpleGameRoom({ initialRoom, onLeaveRoom }: SimpleGameRoomProps) {
  const { account, signAndExecuteTransaction } = useWallet()
  const [room, setRoom] = useState<GameRoom>(initialRoom)
  const [loading, setLoading] = useState(false)
  const [connectionStatus, setConnectionStatus] = useState<"connected" | "reconnecting" | "error">("connected")
  const [retryCount, setRetryCount] = useState(0)
  const [lastMoveTime, setLastMoveTime] = useState<number>(0)
  const [isForfeit, setIsForfeit] = useState(false)
  const [contractFinished, setContractFinished] = useState(false)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const maxRetries = 5

  useEffect(() => {
    // Don't poll if game is finished
    if (room.status === "finished") {
      console.log("[v0] Game finished, stopping polling")
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }

      const checkForfeit = async () => {
        const result = await checkGameForfeit(room.id)
        if (result.success) {
          setIsForfeit(result.isForfeit)
        }
      }
      checkForfeit()

      return
    }

    const fetchRoomState = async () => {
      try {
        console.log("[v0] Fetching room state for:", room.id)
        const result = await getRoomState(room.id)
        if (result.success && result.room) {
          setRoom(result.room)
          setConnectionStatus("connected")
          setRetryCount(0)
          console.log("[v0] Room state updated successfully")

          if (result.room.status === "finished") {
            console.log("[v0] Game just finished, stopping polling")
            if (intervalRef.current) {
              clearInterval(intervalRef.current)
              intervalRef.current = null
            }

            const forfeitResult = await checkGameForfeit(room.id)
            if (forfeitResult.success) {
              setIsForfeit(forfeitResult.isForfeit)
            }
          }
        } else {
          throw new Error(result.error || "Failed to fetch room state")
        }
      } catch (error) {
        console.error("[v0] Error fetching room state:", error)

        if (error instanceof Error && error.message.includes("Room not found")) {
          console.log("[v0] Room no longer exists, attempting cleanup and returning to lobby")
          // Try to notify server that we're leaving (even if room doesn't exist)
          if (account?.address) {
            try {
              await leaveRoom(room.id, account.address)
            } catch (leaveError) {
              console.log("[v0] Expected error when leaving non-existent room:", leaveError)
            }
          }
          alert("This room is no longer available. Returning to lobby.")
          onLeaveRoom()
          return
        }

        setConnectionStatus("error")
        setRetryCount((prev) => prev + 1)

        if (retryCount < maxRetries) {
          setConnectionStatus("reconnecting")
          const backoffDelay = Math.min(1000 * Math.pow(2, retryCount), 8000)
          setTimeout(() => {
            setConnectionStatus("connected")
          }, backoffDelay)
        } else {
          console.log("[v0] Max retries reached, attempting cleanup and returning to lobby")
          // Try to notify server that we're leaving before giving up
          if (account?.address) {
            try {
              await leaveRoom(room.id, account.address)
            } catch (leaveError) {
              console.log("[v0] Error during final cleanup:", leaveError)
            }
          }
          alert("Unable to reconnect to the game. Returning to lobby.")
          onLeaveRoom()
        }
      }
    }

    fetchRoomState()
    if (room.status !== "finished") {
      intervalRef.current = setInterval(fetchRoomState, 2000)
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [room.id, room.status, retryCount, onLeaveRoom])

  // Handle contract finish when game ends with a winner
  useEffect(() => {
    const handleContractFinish = async () => {
      // Only call if game is finished, has a winner, has treasury ID, and hasn't been called yet
      if (room.status === "finished" && room.winner && room.treasuryId && !contractFinished && signAndExecuteTransaction) {
        console.log("[v0] Game finished with winner, calling finish_game contract")
        setContractFinished(true)
        
        try {
          const result = await finishGame(account.address, room.winner, room.treasuryId, signAndExecuteTransaction)
          
          if (result.success) {
            console.log("[v0] Contract finish_game called successfully:", result.digest)
          } else {
            console.error("[v0] Failed to call finish_game contract:", result.error)
          }
        } catch (error) {
          console.error("[v0] Error calling finish_game contract:", error)
        }
      }
    }

    handleContractFinish()
  }, [room.status, room.winner, room.treasuryId, contractFinished, signAndExecuteTransaction])

  const handleMove = async (position: number) => {
    if (!account?.address || loading) return

    const now = Date.now()
    if (now - lastMoveTime < 500) {
      console.log("[v0] Move blocked: too rapid")
      return
    }

    console.log("[v0] Making move at position:", position)
    setLoading(true)
    setLastMoveTime(now)

    try {
      const result = await makeMove(room.id, account.address, position)

      if (result.success && result.room) {
        console.log("[v0] Move successful:", result.room)
        setRoom(result.room)
        setConnectionStatus("connected")
        setRetryCount(0)
      } else {
        console.error("[v0] Move failed:", result.error)
        if (result.error?.includes("Invalid move")) {
          alert("Invalid move. Please try a different position.")
        } else if (result.error?.includes("not your turn")) {
          alert("It's not your turn yet. Please wait for the other player.")
        } else {
          alert(result.error || "Move failed. Please try again.")
        }
      }
    } catch (error) {
      console.error("[v0] Error making move:", error)
      alert("Network error. Your move may not have been registered. Please try again.")
      setConnectionStatus("error")
    } finally {
      setLoading(false)
    }
  }

  const handleLeaveRoom = async () => {
    if (!account?.address) {
      onLeaveRoom()
      return
    }

    try {
      const result = await leaveRoom(room.id, account.address)
      if (result.success) {
        console.log("[v0] Successfully left room")
      }
    } catch (error) {
      console.error("[v0] Error leaving room:", error)
    } finally {
      onLeaveRoom()
    }
  }

  const currentPlayer = room.players.find((p) => p.address === account?.address)
  const isMyTurn = currentPlayer?.symbol === room.currentPlayer
  const canPlay = room.status === "playing" && isMyTurn && !loading && connectionStatus === "connected"

  const getGameResult = () => {
    if (!account?.address) return null

    if (room.winner) {
      const winner = room.players.find((p) => p.address === room.winner)
      if (winner) {
        const isWinner = winner.address === account.address

        let message = ""
        if (isForfeit) {
          message = isWinner ? "🏆 Você Ganhou por Desistência!" : "😔 Você Perdeu por Desistência!"
        } else {
          message = isWinner ? "🏆 Você Ganhou!" : "😔 Você Perdeu!"
        }

        return {
          message,
          winnerName: winner.name,
          isWinner: isWinner,
        }
      }
      return { message: "Game finished", isWinner: false }
    }
    if (room.status === "finished") {
      return { message: "🤝 Empate!", isWinner: false }
    }
    return null
  }

  return (
    <div className="w-full max-w-2xl mx-auto space-y-6">
      {connectionStatus !== "connected" && (
        <Card className="border-yellow-200 bg-yellow-50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse"></div>
              <p className="text-sm text-yellow-700">
                {connectionStatus === "reconnecting"
                  ? "Reconnecting to game..."
                  : "Connection issues detected. Game may be out of sync."}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Room Info */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>{room.name}</CardTitle>
            <div className="flex gap-2">
              {room.status !== "finished" && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setRetryCount((prev) => prev + 1)}
                  disabled={connectionStatus === "reconnecting"}
                >
                  Refresh
                </Button>
              )}
              <Button variant="outline" onClick={handleLeaveRoom}>
                Leave Room
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <Badge variant="secondary">Room ID: {room.id}</Badge>
            <Badge variant={room.status === "playing" ? "default" : "secondary"}>
              {room.status === "waiting"
                ? "Waiting for players"
                : room.status === "playing"
                  ? "Game in progress"
                  : "Game finished"}
            </Badge>
            {room.status !== "finished" && (
              <Badge variant={connectionStatus === "connected" ? "default" : "destructive"}>
                {connectionStatus === "connected"
                  ? "Connected"
                  : connectionStatus === "reconnecting"
                    ? "Reconnecting"
                    : "Disconnected"}
              </Badge>
            )}
          </div>

          <div className="mt-4 space-y-2">
            <h4 className="font-medium">Players:</h4>
            {room.players.map((player, index) => (
              <div key={player.address} className="flex items-center gap-2">
                <Badge variant={player.address === account?.address ? "default" : "outline"}>{player.symbol}</Badge>
                <span className="text-sm">
                  {player.name} {player.address === account?.address && "(You)"}
                </span>
              </div>
            ))}
          </div>

          {room.status === "playing" && (
            <div className="mt-4">
              <p className="text-sm">
                Current turn: <Badge variant="secondary">{room.currentPlayer}</Badge>
                {isMyTurn && <span className="ml-2 text-green-600">Your turn!</span>}
                {!isMyTurn && room.players.length === 2 && (
                  <span className="ml-2 text-blue-600">Waiting for opponent...</span>
                )}
              </p>
            </div>
          )}

          {getGameResult() && (
            <div
              className={`mt-4 p-4 rounded-lg border-2 ${
                getGameResult()?.isWinner
                  ? "bg-green-50 border-green-200"
                  : getGameResult()?.message.includes("Empate")
                    ? "bg-blue-50 border-blue-200"
                    : "bg-red-50 border-red-200"
              }`}
            >
              <div className="text-center space-y-2">
                <p
                  className={`text-lg font-bold ${
                    getGameResult()?.isWinner
                      ? "text-green-700"
                      : getGameResult()?.message.includes("Empate")
                        ? "text-blue-700"
                        : "text-red-700"
                  }`}
                >
                  {getGameResult()?.message}
                </p>
                {getGameResult()?.winnerName && !getGameResult()?.isWinner && (
                  <p className="text-sm text-gray-600">Vencedor: {getGameResult()?.winnerName}</p>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Game Board */}
      {room.status !== "waiting" && (
        <Card>
          <CardHeader>
            <CardTitle>Tic Tac Toe</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-2 w-fit mx-auto">
              {room.board.map((cell, index) => (
                <Button
                  key={index}
                  variant="outline"
                  className={`w-20 h-20 text-2xl font-bold bg-transparent ${
                    canPlay && cell === null ? "hover:bg-primary/10 hover:border-primary" : ""
                  }`}
                  onClick={() => handleMove(index)}
                  disabled={!canPlay || cell !== null}
                >
                  {cell}
                </Button>
              ))}
            </div>
            {room.status === "playing" && (
              <div className="text-center mt-4">
                {!canPlay && (
                  <p className="text-sm text-muted-foreground">
                    {!isMyTurn ? "Wait for your turn" : connectionStatus !== "connected" ? "Reconnecting..." : ""}
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {room.status === "waiting" && room.players.length === 1 && (
        <Card>
          <CardContent className="text-center py-8">
            <p className="text-muted-foreground">Waiting for another player to join...</p>
            <p className="text-sm text-muted-foreground mt-2">
              Share Room ID: <strong>{room.id}</strong>
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
