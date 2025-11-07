// test/board.test.ts
// Mocha tests for Problem 1 Board (sync, no waiting)

import { strict as assert } from "assert";
import * as path from "path";
import { promises as fs } from "fs";
import { Board } from "../src/board.js"; // NodeNext: use .js extension

const BOARDS_DIR = path.resolve("boards");
const PERFECT = path.join(BOARDS_DIR, "perfect.txt");

function linesOf(s: string): string[] {
  return s.replace(/\r\n/g, "\n").replace(/\r/g, "\n").trimEnd().split("\n");
}

function spotAt(snapshot: string, rows: number, cols: number, r: number, c: number): string {
  const lines = linesOf(snapshot);
  assert.equal(lines[0], `${rows}x${cols}`);
  const idx = 1 + r * cols + c;
  assert.ok(idx >= 1 && idx < lines.length, "index inside snapshot body");
  return lines[idx]!;
}

describe("Board — Problem 1", () => {
  it("parses perfect.txt and returns an all-down snapshot", async () => {
    const board = await Board.parseFromFile(PERFECT);
    const snap = board.snapshot("alice");
    const L = linesOf(snap);
    assert.equal(L[0], "3x3");
    for (let i = 1; i < L.length; i++) assert.equal(L[i], "down");
  });

    it("rejects malformed files (wrong number of cards)", async () => {
    const txt = await fs.readFile(PERFECT, "utf8");
    // Append an extra valid-looking card line to break expected count:
    const fewer = txt + (txt.endsWith("\n") ? "" : "\n") + "EXTRA_CARD\n";
    const tmp = path.join(BOARDS_DIR, "__bad_cards.txt");
    await fs.writeFile(tmp, fewer, "utf8");
    try {
      await assert.rejects(Board.parseFromFile(tmp));
    } finally {
      await fs.unlink(tmp);
    }
  });

  it("mismatch: stays up, then 3-B flips both back down on next first move", async () => {
    const board = await Board.parseFromFile(PERFECT);

    board.flipFirst({ r: 0, c: 0 }, "alice");
    let snap = board.snapshot("alice");
    assert.match(spotAt(snap, 3, 3, 0, 0), /^my /);

    board.flipSecond({ r: 0, c: 2 }, "alice"); // different label
    snap = board.snapshot("alice");
    assert.match(spotAt(snap, 3, 3, 0, 0), /^up /);
    assert.match(spotAt(snap, 3, 3, 0, 2), /^up /);

    board.flipFirst({ r: 2, c: 2 }, "alice");  // next first triggers 3-B
    snap = board.snapshot("alice");
    assert.equal(spotAt(snap, 3, 3, 0, 0), "down");
    assert.equal(spotAt(snap, 3, 3, 0, 2), "down");
  });

  it("match: remains controlled, then 3-A removes the pair on next first move", async () => {
    const board = await Board.parseFromFile(PERFECT);

    board.flipFirst({ r: 0, c: 0 }, "alice");
    board.flipSecond({ r: 0, c: 1 }, "alice"); // known pair in perfect.txt

    let snap = board.snapshot("alice");
    assert.match(spotAt(snap, 3, 3, 0, 0), /^my /);
    assert.match(spotAt(snap, 3, 3, 0, 1), /^my /);

    board.flipFirst({ r: 1, c: 1 }, "alice");  // triggers 3-A remove
    snap = board.snapshot("alice");
    assert.equal(spotAt(snap, 3, 3, 0, 0), "none");
    assert.equal(spotAt(snap, 3, 3, 0, 1), "none");
  });

  it("1-A: first flip on an empty space throws", async () => {
    const board = await Board.parseFromFile(PERFECT);

    // Make and remove a match first
    board.flipFirst({ r: 0, c: 0 }, "alice");
    board.flipSecond({ r: 0, c: 1 }, "alice"); // match
    board.flipFirst({ r: 1, c: 1 }, "alice");  // remove pair

    assert.throws(() => board.flipFirst({ r: 0, c: 0 }, "alice"));
  });
});