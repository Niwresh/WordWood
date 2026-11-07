/* ============================================================
   WORDWOOD — Board & tile management
   ============================================================ */
(function (global) {
  'use strict';

  const { ROWS, COLS, LETTER_POOL, SPECIAL_TILES, LEVELS } = global.CONFIG;

  /**
   * Represents a single tile on the board.
   */
  class Tile {
    constructor(letter, special = null) {
      this.letter = letter;        // single uppercase char or wildcard marker
      this.special = special;       // 'gold' | 'rainbow' | 'bomb' | 'star' | 'danger' | null
      this.id = Tile._nextId++;
      this.isWildcard = special === 'rainbow';
    }
  }
  Tile._nextId = 0;

  /**
   * Board class: manages the grid of tiles.
   */
  class Board {
    constructor() {
      this.rows = ROWS;
      this.cols = COLS;
      this.grid = [];           // grid[r][c] = Tile | null
      this.selected = [];       // array of {r, c} in selection order
      this._init();
    }

    _init() {
      this.grid = [];
      for (let r = 0; r < this.rows; r++) {
        const row = [];
        for (let c = 0; c < this.cols; c++) {
          row.push(this._randomTile(null));
        }
        this.grid.push(row);
      }
    }

    _randomLetter() {
      return LETTER_POOL[Math.floor(Math.random() * LETTER_POOL.length)];
    }

    /**
     * Create a random tile. Special chance based on level definition.
     * @param {object|null} levelDef - current level definition
     */
    _randomTile(levelDef, allowedSpecials = null) {
      let special = null;
      const specialChance = levelDef ? (levelDef.specialChance || 0.05) : 0.05;
      const dangerLevel = levelDef ? (levelDef.dangerLevel || 0) : 0;

      // Determine which specials are allowed (unlocked)
      const levelNum = levelDef ? levelDef.level : 1;
      const possible = [];
      for (const key of Object.keys(SPECIAL_TILES)) {
        const def = SPECIAL_TILES[key];
        if (levelNum >= def.unlockLevel) {
          possible.push(key);
        }
      }

      if (allowedSpecials) {
        // restrict to intersection
        for (let i = possible.length - 1; i >= 0; i--) {
          if (!allowedSpecials.includes(possible[i])) possible.splice(i, 1);
        }
      }

      if (possible.length > 0 && Math.random() < specialChance) {
        // Weighted: danger more likely at higher danger levels
        if (possible.includes('danger') && Math.random() < dangerLevel) {
          special = 'danger';
        } else {
          // exclude danger from normal pick unless weighted
          const normals = possible.filter(s => s !== 'danger');
          if (normals.length > 0) {
            special = normals[Math.floor(Math.random() * normals.length)];
          } else {
            special = possible[Math.floor(Math.random() * possible.length)];
          }
        }
      }

      let letter = this._randomLetter();
      if (special === 'rainbow') letter = '★'; // displayed as wildcard star

      return new Tile(letter, special);
    }

    /**
     * Get tile at position, or null.
     */
    getTile(r, c) {
      if (r < 0 || r >= this.rows || c < 0 || c >= this.cols) return null;
      return this.grid[r][c];
    }

    /**
     * Is the position within board bounds?
     */
    inBounds(r, c) {
      return r >= 0 && r < this.rows && c >= 0 && c < this.cols;
    }

    /**
     * Check if two positions are adjacent (8-way).
     */
    static areAdjacent(a, b) {
      const dr = Math.abs(a.r - b.r);
      const dc = Math.abs(a.c - b.c);
      return (dr <= 1 && dc <= 1) && !(dr === 0 && dc === 0);
    }

    /**
     * Try to select a tile at (r,c).
     * Returns true if selection was added.
     */
    select(r, c) {
      if (!this.inBounds(r, c)) return false;
      const tile = this.grid[r][c];
      if (!tile) return false;

      // Already selected?
      if (this.selected.some(p => p.r === r && p.c === c)) return false;

      // Must be adjacent to last selection (if any)
      if (this.selected.length > 0) {
        const last = this.selected[this.selected.length - 1];
        if (!Board.areAdjacent(last, { r, c })) return false;
      }

      this.selected.push({ r, c });
      return true;
    }

    /**
     * Remove the last selection. Returns removed position or null.
     */
    deselectLast() {
      return this.selected.pop() || null;
    }

    /**
     * Clear all selections.
     */
    clearSelection() {
      this.selected = [];
    }

    /**
     * Get the current word string from selection.
     */
    getCurrentWord() {
      return this.selected.map(p => {
        const tile = this.grid[p.r][p.c];
        if (!tile) return '';
        if (tile.isWildcard) return '?'; // placeholder for wildcard
        return tile.letter;
      }).join('');
    }

    /**
     * Get positions and specials for the current selection.
     */
    getSelectionInfo() {
      let goldBonus = 0;
      let starMultiplier = 1;
      let hasBomb = false;
      let bombPositions = [];
      const rainbowPositions = [];

      for (const p of this.selected) {
        const tile = this.grid[p.r][p.c];
        if (!tile) continue;
        if (tile.special === 'gold') goldBonus += SPECIAL_TILES.gold.bonusPoints;
        if (tile.special === 'star') starMultiplier *= SPECIAL_TILES.star.multiplier;
        if (tile.special === 'bomb') {
          hasBomb = true;
          bombPositions.push(p);
        }
        if (tile.special === 'rainbow') {
          rainbowPositions.push(p);
        }
      }

      return { goldBonus, starMultiplier, hasBomb, bombPositions, rainbowPositions };
    }

    /**
     * Remove tiles at given positions from the board. Returns list of removed tiles.
     */
    removeTiles(positions) {
      const removed = [];
      for (const p of positions) {
        if (!this.inBounds(p.r, p.c)) continue;
        const tile = this.grid[p.r][p.c];
        if (tile) {
          removed.push({ r: p.r, c: p.c, tile });
          this.grid[p.r][p.c] = null;
        }
      }
      return removed;
    }

    /**
     * Apply gravity: tiles fall down to fill empty spaces in each column.
     * Returns array of moves: { from, to }.
     */
    applyGravity() {
      const moves = [];
      for (let c = 0; c < this.cols; c++) {
        // Collect non-null tiles from bottom up
        let writeRow = this.rows - 1;
        for (let r = this.rows - 1; r >= 0; r--) {
          const tile = this.grid[r][c];
          if (tile) {
            if (writeRow !== r) {
              this.grid[writeRow][c] = tile;
              this.grid[r][c] = null;
              moves.push({ from: { r, c }, to: { r: writeRow, c } });
            }
            writeRow--;
          }
        }
      }
      return moves;
    }

    /**
     * Refill empty tiles with new random tiles.
     * Returns array of { r, c, tile } for new tiles.
     */
    refill(levelDef) {
      const added = [];
      for (let r = 0; r < this.rows; r++) {
        for (let c = 0; c < this.cols; c++) {
          if (!this.grid[r][c]) {
            const tile = this._randomTile(levelDef);
            this.grid[r][c] = tile;
            added.push({ r, c, tile });
          }
        }
      }
      return added;
    }

    /**
     * Get all special positions currently on the board.
     */
    getSpecialPositions() {
      const positions = [];
      for (let r = 0; r < this.rows; r++) {
        for (let c = 0; c < this.cols; c++) {
          const t = this.grid[r][c];
          if (t && t.special) positions.push({ r, c, special: t.special });
        }
      }
      return positions;
    }

    /**
     * Find bomb-affected positions (all tiles within radius 1 of bomb).
     */
    getBombAffected(center) {
      const affected = [];
      for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
          const r = center.r + dr;
          const c = center.c + dc;
          if (this.inBounds(r, c) && this.grid[r][c]) {
            affected.push({ r, c });
          }
        }
      }
      return affected;
    }

    /**
     * Serialize board for saving (letters + specials only).
     */
    serialize() {
      return this.grid.map(row => row.map(t => t ? { l: t.letter, s: t.special } : null));
    }

    /**
     * Restore board from serialized data.
     */
    static deserialize(data) {
      const board = Object.create(Board.prototype);
      board.rows = ROWS;
      board.cols = COLS;
      board.selected = [];
      board.grid = data.map(row => row.map(cell => {
        if (!cell) return null;
        return new Tile(cell.l, cell.s);
      }));
      return board;
    }

    /**
     * Get current level definition based on level number.
     */
    static getLevelDef(levelNum) {
      const idx = Math.min(levelNum - 1, LEVELS.length - 1);
      return LEVELS[idx];
    }
  }

  global.Tile = Tile;
  global.Board = Board;
})(window);