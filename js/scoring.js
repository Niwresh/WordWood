/* ============================================================
   WORDWOOD — Scoring engine
   ============================================================ */
(function (global) {
  'use strict';

  const { LETTER_VALUES, LENGTH_BONUS, COMBO_MULTIPLIERS } = global.CONFIG;

  /**
   * Calculate base score for a word (sum of letter values).
   */
  function baseLetterScore(word) {
    let total = 0;
    for (const ch of word.toUpperCase()) {
      total += LETTER_VALUES[ch] || 0;
    }
    return total;
  }

  /**
   * Get length bonus multiplier for a word length.
   */
  function lengthBonus(wordLength) {
    return LENGTH_BONUS[wordLength] || LENGTH_BONUS[3];
  }

  /**
   * Get combo multiplier for a combo level (1-based).
   */
  function comboMultiplier(comboLevel) {
    const idx = Math.min(Math.max(comboLevel, 1), COMBO_MULTIPLIERS.length - 1);
    return COMBO_MULTIPLIERS[idx];
  }

  /**
   * Calculate score for a word given combo level and star multiplier.
   * Formula: floor( (letterScore * lengthBonus * comboMultiplier * starMult) + goldBonus )
   */
  function calculateWordScore(word, comboLevel, starMultiplier, goldBonus) {
    const letterScore = baseLetterScore(word);
    const lenBonus = lengthBonus(word.length);
    const comboMult = comboMultiplier(comboLevel);
    const starMult = starMultiplier || 1;
    const gold = goldBonus || 0;

    const raw = letterScore * lenBonus * comboMult * starMult;
    return Math.floor(raw + gold);
  }

  /**
   * Calculate target score for a level (defaults to config).
   */
  function levelTarget(levelDef) {
    return levelDef.scoreTarget || 1000;
  }

  /**
   * Format a score with commas.
   */
  function formatScore(n) {
    return Math.floor(n).toLocaleString('en-US');
  }

  global.Scoring = {
    baseLetterScore,
    lengthBonus,
    comboMultiplier,
    calculateWordScore,
    levelTarget,
    formatScore
  };
})(window);