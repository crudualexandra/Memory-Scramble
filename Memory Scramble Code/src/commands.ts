// src/commands.ts
// Problem 2 glue — tiny wrappers that call the Board (no concurrency yet)

import { Board } from "./board.js";

/**
 * Return a text snapshot for this player.
 * Kept async so server.ts can `await` it cleanly.
 * @param board Board instance
 * @param playerId player identifier
 */
export async function look(board: Board, playerId: string): Promise<string> {
  return board.snapshot(playerId);
}

/**
 * Flip first/second depending on player state, then return a snapshot.
 * Uses the synchronous Problem-1 Board rules (no waiting).
 * @param board Board instance
 * @param playerId player identifier
 * @param row row index (0-based)
 * @param column column index (0-based)
 */
export async function flip(
  board: Board,
  playerId: string,
  row: number,
  column: number
): Promise<string> {
  const pos = { r: row, c: column };
  if (board.hasFirstSelection(playerId)) {
    board.flipSecond(pos, playerId);
  } else {
    board.flipFirst(pos, playerId);
  }
  return board.snapshot(playerId);
}

/**
 * Stub for Problem 4 (transformer). The server passes a function,
 * but for Problem 2 we simply ignore it and return a snapshot.
 * @param board Board instance
 * @param playerId player identifier
 * @param _transform async transformer (card) => Promise<string>
 */
export async function map(
  board: Board,
  playerId: string,
  _transform: (card: string) => Promise<string>
): Promise<string> {
  return board.snapshot(playerId);
}

/**
 * Stub for Problem 5 (watch/long-poll). For Problem 2 we return immediately.
 * @param board Board instance
 * @param playerId player identifier
 */
export async function watch(board: Board, playerId: string): Promise<string> {
  return board.snapshot(playerId);
}