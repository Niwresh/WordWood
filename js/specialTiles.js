/* ============================================================
   WORDWOOD — Special tile helpers (referenced by game logic)
   The actual special tile definitions live in config.js.
   This module provides utility functions.
   ============================================================ */
(function (global) {
  'use strict';

  const { SPECIAL_TILES } = global.CONFIG;

  /**
   * Check if a special type is unlocked at a given level.
   */
  function isUnlocked(specialType, levelNum) {
    const def = SPECIAL_TILES[specialType];
    if (!def) return false;
    return levelNum >= def.unlockLevel;
  }

  /**
   * Get all special types unlocked at a level.
   */
  function getUnlockedSpecials(levelNum) {
    return Object.keys(SPECIAL_TILES).filter(k => isUnlocked(k, levelNum));
  }

  /**
   * Apply a special's effect to scoring context.
   * Returns modified { goldBonus, starMultiplier, hasBomb, bombPositions }.
   */
  function applySpecialsToSelection(board, selected) {
    let goldBonus = 0;
    let starMultiplier = 1;
    const bombPositions = [];
    const rainbowPositions = [];

    for (const p of selected) {
      const tile = board.getTile(p.r, p.c);
      if (!tile || !tile.special) continue;
      switch (tile.special) {
        case 'gold':
          goldBonus += SPECIAL_TILES.gold.bonusPoints;
          break;
        case 'star':
          starMultiplier *= SPECIAL_TILES.star.multiplier;
          break;
        case 'bomb':
          bombPositions.push(p);
          break;
        case 'rainbow':
          rainbowPositions.push(p);
          break;
        default:
          break;
      }
    }

    return { goldBonus, starMultiplier, bombPositions, rainbowPositions };
  }

  /**
   * Get the display icon for a special type.
   */
  function getIcon(specialType) {
    return SPECIAL_TILES[specialType]?.icon || '';
  }

  /**
   * Get the CSS class for a special type.
   */
  function getCssClass(specialType) {
    return specialType ? `special-${specialType}` : '';
  }

  global.SpecialTiles = {
    isUnlocked,
    getUnlockedSpecials,
    applySpecialsToSelection,
    getIcon,
    getCssClass,
    SPECIAL_TILES
  };
})(window);