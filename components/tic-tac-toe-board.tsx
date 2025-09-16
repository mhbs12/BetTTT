"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import type { GameState } from "@/types/game"
import { cn } from "@/lib/utils"

interface TicTacToeBoardProps {
  gameState: GameState
  onMove: (position: number) => void
  currentPlayerAddress: string
  disabled: boolean
}

export function TicTacToeBoard({ gameState, onMove, currentPlayerAddress, disabled }: TicTacToeBoardProps) {
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

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="grid grid-cols-3 gap-2 max-w-md mx-auto">
          {Array.from({ length: 9 }, (_, index) => (
            <Button
              key={index}
              variant={getCellVariant(index)}
              size="lg"
              className={cn(
                "h-20 w-20 text-2xl font-bold",
                gameState.board[index] === null && !disabled && "hover:bg-muted",
                gameState.board[index] !== null && "cursor-default",
              )}
              onClick={() => handleCellClick(index)}
              disabled={disabled || gameState.board[index] !== null}
            >
              {getCellContent(index)}
            </Button>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
