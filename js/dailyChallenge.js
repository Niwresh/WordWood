/* ============================================================
   WORDWOOD — Deterministic date-based daily challenge
   ============================================================ */
(function (global) {
  'use strict';

  const { ROWS, COLS, LETTER_POOL } = global.CONFIG;

  /**
   * Simple hash function for a string (deterministic).
   */
  function hashString(str) {
    let h = 2166136261 >>> 0;
    for (let i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h = Math.imul(h, 16777619) >>> 0;
    }
    return h >>> 0;
  }

  /**
   * Mulberry32 seeded PRNG.
   */
  function mulberry32(seed) {
    let a = seed >>> 0;
    return function () {
      a |= 0;
      a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  /**
   * Get today's date key (YYYY-MM-DD in local time).
   */
  function todayKey(date = new Date()) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  /**
   * Generate a deterministic board for a given date key.
   * Returns a 2D array of { l, s } objects.
   */
  function generateBoard(dateKey) {
    const seed = hashString('wordwood-daily-' + dateKey);
    const rand = mulberry32(seed);
    const grid = [];
    for (let r = 0; r < ROWS; r++) {
      const row = [];
      for (let c = 0; c < COLS; c++) {
        // Pick a letter weighted
        const letter = LETTER_POOL[Math.floor(rand() * LETTER_POOL.length)];
        // Sprinkle a gold special every ~25 tiles deterministically
        let special = null;
        const roll = rand();
        if (roll < 0.03) special = 'gold';
        else if (roll < 0.04) special = 'star';
        row.push({ l: letter, s: special });
      }
      grid.push(row);
    }
    return grid;
  }

  /**
   * Generate a deterministic objective for the day.
   */
  function generateObjective(dateKey) {
    const seed = hashString('wordwood-obj-' + dateKey);
    const rand = mulberry32(seed);
    const roll = rand();
    if (roll < 0.4) {
      const target = 1500 + Math.floor(rand() * 4) * 500;
      return { type: 'score', value: target, text: `Score ${target.toLocaleString()} points` };
    } else if (roll < 0.7) {
      const count = 8 + Math.floor(rand() * 8);
      return { type: 'words', value: count, text: `Create ${count} words` };
    } else {
      const len = 5 + Math.floor(rand() * 3);
      return { type: 'longword', value: len, text: `Create a ${len}-letter word` };
    }
  }

  /**
   * Check if today's daily challenge is complete based on save.
   */
  function isCompleted(save) {
    const key = todayKey();
    return save.daily && save.daily.lastDate === key && save.daily.completed;
  }

  /**
   * Get daily challenge info for display.
   */
  function getInfo(save) {
    const key = todayKey();
    const obj = generateObjective(key);
    const completed = isCompleted(save);
    return {
      dateKey: key,
      dateDisplay: new Date().toLocaleDateString(undefined, {
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
      }),
      objective: obj,
      completed,
      score: (save.daily && save.daily.lastDate === key) ? (save.daily.score || 0) : 0
    };
  }

  /**
   * Mark daily challenge as completed with a score.
   */
  function markComplete(score) {
    const key = todayKey();
    const save = global.Storage.load();
    save.daily = {
      lastDate: key,
      completed: true,
      objective: generateObjective(key).text,
      score: score || 0
    };
    global.Storage.update({ daily: save.daily });
  }

  global.DailyChallenge = {
    todayKey,
    generateBoard,
    generateObjective,
    isCompleted,
    getInfo,
    markComplete
  };
})(window);