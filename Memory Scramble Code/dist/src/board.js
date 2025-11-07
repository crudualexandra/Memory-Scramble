// src/board.ts
// Board ADT for Memory Scramble — Problem 1 (sync board, no waiting)
import { promises as fs } from "fs";
import * as path from "path";
/**
 * Mutable Board ADT.
 *
 * AF: rows×cols grid of spaces (`null` = empty) or Slot; firstSelection[p] remembers p's first card;
 *     pending[p] stores work to apply on p’s next first move (3-A/3-B).
 *
 * RI: grid.length == rows; each row length == cols; Slot.label matches /^[^\s\n\r]+$/u;
 *     if faceDown then controller === null; pending positions are in-bounds.
 *
 * SRE: fields are private; only string snapshots are exposed.
 */
export class Board {
    rows;
    cols;
    // never reassigned as a whole; mutated internally
    grid;
    firstSelection = new Map();
    pending = new Map();
    constructor(rows, cols, labels) {
        this.rows = rows;
        this.cols = cols;
        this.grid = Array.from({ length: rows }, (_, r) => Array.from({ length: cols }, (_, c) => {
            const idx = r * cols + c;
            const label = labels[idx];
            if (label === undefined)
                throw new Error("Internal: missing label");
            return { label, faceUp: false, controller: null };
        }));
        this.checkRep();
    }
    /**
     * Parse board file (ROWxCOL header + exactly ROW*COL card lines).
     * @param filename path to board file
     * @returns a new Board
     */
    static async parseFromFile(filename) {
        const text = await fs.readFile(path.resolve(filename), "utf8");
        const lines = text
            .replace(/\r\n/g, "\n")
            .replace(/\r/g, "\n")
            .split("\n")
            .filter(l => l.length > 0);
        if (lines.length < 1)
            throw new Error("Malformed board: missing header");
        const header = lines[0] ?? "";
        const m = /^([0-9]+)x([0-9]+)$/.exec(header);
        if (!m)
            throw new Error(`Malformed header '${header}', expected ROWxCOL`);
        const rows = parseInt(m[1] ?? "0", 10);
        const cols = parseInt(m[2] ?? "0", 10);
        if (!Number.isFinite(rows) || !Number.isFinite(cols) || rows <= 0 || cols <= 0) {
            throw new Error("Rows/cols must be positive integers");
        }
        const expected = rows * cols;
        const cards = lines.slice(1);
        if (cards.length !== expected) {
            throw new Error(`Malformed board: expected ${expected} card lines, got ${cards.length}`);
        }
        const cardRe = /^[^\s\n\r]+$/u;
        for (const c of cards) {
            if (!cardRe.test(c))
                throw new Error(`Invalid card '${c}'`);
        }
        return new Board(rows, cols, cards);
    }
    /** @returns debug string */
    toString() { return `Board(${this.rows}x${this.cols})`; }
    /** @param p player id @returns whether player has a first selection recorded */
    hasFirstSelection(p) { return this.firstSelection.has(p); }
    /**
     * Apply rules 3-A/3-B for player p before a new first flip.
     * @param p player id
     */
    settleBeforeNewFirstMove(p) {
        const outcome = this.pending.get(p) ?? null;
        if (!outcome)
            return;
        if (outcome.kind === "matched") {
            const a = outcome.first, b = outcome.second;
            this.setCell(a.r, a.c, null);
            this.setCell(b.r, b.c, null);
        }
        else {
            const { first, second } = outcome;
            for (const q of [first, second]) {
                const cell = this.getCell(q.r, q.c);
                if (cell !== null && cell.faceUp && cell.controller === null) {
                    cell.faceUp = false;
                }
            }
        }
        this.pending.set(p, null);
        this.checkRep();
    }
    /**
     * First card attempt (1-A..1-D without waiting).
     * @param pos row/col
     * @param by player id
     */
    flipFirst(pos, by) {
        this.settleBeforeNewFirstMove(by);
        const slot = this.slotAt(pos);
        if (slot === null)
            throw new Error("1-A: empty space");
        if (!slot.faceUp) {
            slot.faceUp = true;
            slot.controller = by; // 1-B
        }
        else if (slot.controller === null) {
            slot.controller = by; // 1-C
        }
        else if (slot.controller !== by) {
            throw new Error("1-D: card is controlled by another player (no waiting in Problem 1)");
        }
        this.firstSelection.set(by, pos);
        this.checkRep();
    }
    /**
     * Second card attempt (2-A..2-E).
     * @param pos row/col
     * @param by player id
     */
    flipSecond(pos, by) {
        const first = this.firstSelection.get(by);
        if (!first)
            throw new Error("No first card selected for this player");
        const s2 = this.within(pos) ? this.getCell(pos.r, pos.c) : null;
        if (s2 === null) {
            this.relinquishFirstOnly(by);
            throw new Error("2-A: second position is empty");
        }
        if (s2.faceUp && s2.controller !== null) {
            this.relinquishFirstOnly(by);
            throw new Error("2-B: second card is controlled");
        }
        if (!s2.faceUp)
            s2.faceUp = true; // 2-C
        const s1 = this.slotAt(first);
        if (!s1)
            throw new Error("Internal: first selection missing");
        const matched = s1.label === s2.label;
        if (matched) {
            s1.controller = by;
            s2.controller = by; // 2-D
            this.pending.set(by, { kind: "matched", first, second: pos });
        }
        else {
            s1.controller = null;
            s2.controller = null; // 2-E
            this.pending.set(by, { kind: "mismatched", first, second: pos });
        }
        this.firstSelection.delete(by);
        this.checkRep();
    }
    /**
     * Snapshot for a player in required grammar.
     * @param forPlayer player id
     * @returns string snapshot
     */
    snapshot(forPlayer) {
        const out = [];
        out.push(`${this.rows}x${this.cols}`);
        for (let r = 0; r < this.rows; r++) {
            for (let c = 0; c < this.cols; c++) {
                const cell = this.getCell(r, c);
                if (cell === null)
                    out.push("none");
                else if (!cell.faceUp)
                    out.push("down");
                else if (cell.controller === forPlayer)
                    out.push(`my ${cell.label}`);
                else
                    out.push(`up ${cell.label}`);
            }
        }
        return out.join("\n") + "\n";
    }
    // ---------- helpers ----------
    row(r) {
        const row = this.grid[r];
        if (row === undefined)
            throw new Error("RI: row index out of bounds");
        return row;
    }
    getCell(r, c) {
        const row = this.row(r);
        return (row[c] ?? null);
    }
    setCell(r, c, val) {
        const row = this.row(r);
        if (c < 0 || c >= this.cols)
            throw new Error("RI: column index out of bounds");
        row[c] = val;
    }
    within(p) {
        return p.r >= 0 && p.r < this.rows && p.c >= 0 && p.c < this.cols;
    }
    slotAt(p) {
        if (!this.within(p))
            throw new Error(`Out of bounds (${p.r},${p.c})`);
        return this.getCell(p.r, p.c);
    }
    relinquishFirstOnly(by) {
        const first = this.firstSelection.get(by);
        if (!first)
            return;
        const s1 = this.slotAt(first);
        if (s1 !== null) {
            s1.controller = null; // remain face up
        } // remain face up
        this.firstSelection.delete(by);
        this.checkRep();
    }
    checkRep() {
        if (this.grid.length !== this.rows)
            throw new Error("RI: wrong row count");
        for (const row of this.grid) {
            if (row === undefined || row.length !== this.cols)
                throw new Error("RI: wrong col count");
        }
        const cardRe = /^[^\s\n\r]+$/u;
        for (let r = 0; r < this.rows; r++) {
            for (let c = 0; c < this.cols; c++) {
                const cell = this.getCell(r, c);
                if (cell === null)
                    continue;
                if (!cardRe.test(cell.label))
                    throw new Error("RI: bad label");
                if (!cell.faceUp && cell.controller !== null)
                    throw new Error("RI: face-down card cannot be controlled");
            }
        }
        for (const [, out] of this.pending) {
            if (!out)
                continue;
            for (const p of [out.first, out.second]) {
                if (!this.within(p))
                    throw new Error("RI: pending pos OOB");
            }
        }
    }
}
//# sourceMappingURL=board.js.map