"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import type { GameState } from "@/types/game"
import { cn } from "@/lib/utils"

interface RealtimeTicTacToeBoardProps {
  gameState: GameState
  onMove: (position: number) => void
  currentPlayerAddress: string
  disabled: boolean
}

export function RealtimeTicTacToeBoard({
  gameState,
  onMove,
  currentPlayerAddress,
  disabled,
}: RealtimeTicTacToeBoardProps) {
  const handleCellClick = (position: number) => {
    if (disabled || gameState.board[position] !== null) return
    onMove(position)
  }

  const getCellContent = (position: number) => {
    const value = gameState.board[position]
    if (!value) return ""
    return value
  }

  const getCellVariant = (position: number) => {
    const value = gameState.board[position]
    if (!value) return "outline"
    return value === "X" ? "default" : "secondary"
  }

  const isWinningCell = (position: number) => {
    if (gameState.gameStatus !== "finished" || !gameState.winner) return false

    const winningCombinations = [
      [0, 1, 2],
      [3, 4, 5],
      [6, 7, 8], // Rows
      [0, 3, 6],
      [1, 4, 7],
      [2, 5, 8], // Columns
      [0, 4, 8],
      [2, 4, 6], // Diagonals
    ]

    for (const combination of winningCombinations) {
      const [a, b, c] = combination
      if (
        gameState.board[a] === gameState.winner &&
        gameState.board[b] === gameState.winner &&
        gameState.board[c] === gameState.winner
      ) {
        return combination.includes(position)
      }
    }

    return false
  }

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="grid grid-cols-3 gap-3 max-w-md mx-auto">
          {Array.from({ length: 9 }, (_, index) => (
            <Button
              key={index}
              variant={getCellVariant(index)}
              size="lg"
              className={cn(
                "h-20 w-20 text-3xl font-bold transition-all duration-200",
                gameState.board[index] === null && !disabled && "hover:bg-muted hover:scale-105",
                gameState.board[index] !== null && "cursor-default",
                isWinningCell(index) && "ring-2 ring-yellow-400 bg-yellow-50 dark:bg-yellow-900/20",
                disabled && "opacity-50",
              )}
              onClick={() => handleCellClick(index)}
              disabled={disabled || gameState.board[index] !== null}
            >
              {getCellContent(index)}
            </Button>
          ))}
        </div>

        {/* Game Status Indicator */}
        <div className="text-center mt-4">
          {gameState.gameStatus === "playing" && (
            <p className="text-sm text-muted-foreground">
              {disabled ? "Waiting for your turn..." : "Click a cell to make your move"}
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
