# Wordwood · The Verdant Library

A polished, fully offline word-puzzle game inspired by classic Bookworm mechanics, built with **pure HTML5, CSS3, and vanilla JavaScript**. No frameworks, no build tools, no backend.

## Quick Start

1. Open the project folder in **VS Code**.
2. Install the **Live Server** extension (if not already installed).
3. Right-click `index.html` → **Open with Live Server**.
4. Play!

The game runs entirely in the browser. No server-side code, no external libraries, no network requests.

## Features

- **8×10 letter grid** with 8-directional adjacency (horizontal, vertical, diagonal).
- **Pointer Events** for unified mouse + touch support (drag to select, or tap tiles sequentially).
- **Curated offline dictionary** — thousands of common English words stored in a JavaScript `Set`.
- **Scoring system** with:
  - Per-letter values (Scrabble-like).
  - Word-length bonuses.
  - Combo multipliers (×1 → ×20).
  - Level multipliers and special-tile bonuses.
- **5 special tile types** that unlock progressively:
  - 🟡 **Gold** — flat bonus points.
  - 🌈 **Rainbow** — wildcard letter.
  - 💣 **Bomb** — clears nearby tiles.
  - ⭐ **Star** — score multiplier.
  - 💀 **Danger** — increases game pressure.
- **10 progressive levels** with unique objectives (score, word count, long words, combos).
- **Persistent save data** via `localStorage`:
  - Best score, highest level, games played, total words, longest word, highest combo.
  - Unlocked achievements.
  - Settings (sound, music, volume, reduced motion).
  - Daily challenge completion.
- **8 achievements** to unlock.
- **Daily Challenge** — deterministic date-based board and objective, saved per day.
- **Web Audio API** sound effects (no audio files needed).
- **Fully responsive** — desktop, laptop, tablet, mobile (portrait & landscape).
- **Animated tiles** — selection, destruction, falling, spawning, invalid-word shake, score popups, combo flashes, level celebrations, game-over shake.
- **Keyboard shortcuts**:
  - `ENTER` — Submit word
  - `ESC` / `P` — Pause
  - `BACKSPACE` — Clear selection
  - `R` — Restart
- **Reduced motion** setting for accessibility.

## File Structure
