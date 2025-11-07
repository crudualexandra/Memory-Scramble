# Problem 1: Board ADT Implementation - Report

## What We Did

### 1. Designed the Board Data Structure
We created a **Board class** to represent the Memory Scramble game board with:
- A **2D grid** to store cards (each card has: content, face-up/down state, and optional controller)
- A **players map** to track each player's state (which cards they control)
- Full **documentation**: Abstraction Function (AF), Representation Invariant (RI), and Safety from Rep Exposure

### 2. Implemented Core Game Mechanics
Following the Memory Scramble rules from the assignment:

**Card Flipping Logic:**
- **First Card**: Player flips a face-down card, it becomes face-up and they control it
- **Second Card**: Player flips another card
  - If they match → player keeps control of both cards
  - If they don't match → player releases control, cards stay face-up
- **Next Move**: Before flipping a new first card:
  - If previous cards matched → remove them from board
  - If previous cards didn't match → turn them face-down (if not controlled by another player)

**Special Cases Handled:**
- Flipping an empty space → throws error
- Flipping a card controlled by another player → throws error (for now, Problem 3 will add waiting)
- Flipping the same card twice in a row → treats as new first card flip

### 3. File Parsing
Implemented `parseFromFile()` to load game boards from text files:
- Format: `ROWSxCOLUMNS` on first line, then one card per line
- Validates file format and card content
- Examples: `perfect.txt` (3x3 with emoji), `ab.txt` (5x5 with letters)

### 4. Player Perspective
Implemented `look()` method that shows board from each player's view:
- `down` = face-down card
- `up CARD` = face-up card controlled by another player or no one
- `my CARD` = face-up card controlled by this player
- `none` = empty space (card was removed)

## Code Structure

**Main Types:**
```typescript
type Card = {
  content: string;        // The card's label (e.g., "🦄", "A")
  faceUp: boolean;        // Is it face-up?
  controller: string | undefined;  // Who controls it?
}

type PlayerState = {
  firstCard: position | undefined;   // Their first card
  secondCard: position | undefined;  // Their second card (if matched)
}
```

**Key Methods:**
- `constructor(rows, columns, cards)` - Creates new board
- `parseFromFile(filename)` - Loads board from file
- `look(playerId)` - Returns board state for a player
- `flip(playerId, row, column)` - Flips a card following game rules
- `checkRep()` - Validates representation invariant

## Testing Strategy

We wrote **26 comprehensive tests** covering:

1. **File Parsing** (3 tests)
   - Valid files (perfect.txt, ab.txt)
   - Invalid files

2. **Constructor** (6 tests)
   - Different board sizes (2x2, 3x3)
   - Emoji and text cards
   - Invalid inputs (wrong card count, empty cards, whitespace)

3. **Looking at Board** (3 tests)
   - Initial state (all cards down)
   - Correct dimensions
   - Multiple players see same initial board

4. **Flipping First Card** (4 tests)
   - Successfully flip face-down card
   - Invalid coordinates (out of bounds, negative)

5. **Flipping Second Card** (4 tests)
   - Matching pair removal
   - Non-matching cards stay face-up
   - Non-matching cards turn face-down on next move
   - Flipping empty space throws error

6. **Multiple Players** (2 tests)
   - Players see their own vs others' controlled cards
   - Can't flip another player's controlled card

7. **Game Scenarios** (2 tests)
   - Complete 2x2 game
   - Complex sequence of moves

8. **String Representation** (2 tests)
   - toString() for debugging

## How to Test

### Run All Tests
```bash
cd MIT-6.102-ps4
npm test
```

**Expected Output:**
- ✅ All 26 tests passing
- No errors, only 3 warnings (TODOs in simulation.ts which we'll fix later)

### Screenshot Locations
**📸 Screenshot 1**: Test results showing "26 passing"
- Location: After running `npm test`
- Shows: All test suites with checkmarks

## Key Design Decisions

1. **Synchronous Implementation**: For Problem 1, all methods are synchronous (except parseFromFile which reads files). Problem 3 will add async/concurrency.

2. **Card Control Tracking**: We track which player controls which cards by storing the playerId in the card object AND maintaining player state separately. This redundancy helps enforce the representation invariant.

3. **Rule 3 Implementation**: We handle previous cards (removing matched pairs or turning down non-matched cards) BEFORE flipping a new first card, which matches the game rules.

4. **Same-Card Re-flip**: If a player tries to flip their own controlled first card again, we treat it as starting a new first-card flip (releasing the old one first).

## Files Modified
- `src/board.ts` - Complete Board implementation (~460 lines)
- `test/board.test.ts` - Comprehensive test suite (~310 lines)

## Next Steps (Problem 2)
- Implement `look()` and `flip()` in `commands.ts` as simple glue code
- Start the web server and test in browser
- Play the game!
