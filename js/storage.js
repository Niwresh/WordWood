/* ============================================================
   WORDWOOD — localStorage persistence with safe parsing
   ============================================================ */
(function (global) {
  'use strict';

  const { STORAGE_KEY } = global.CONFIG;

  const DEFAULT_SAVE = {
    bestScore: 0,
    highestLevel: 1,
    gamesPlayed: 0,
    totalWords: 0,
    longestWord: '',
    highestCombo: 1,
    achievements: {},
    settings: {
      sound: true,
      music: true,
      volume: 0.5,
      reducedMotion: false
    },
    daily: {
      lastDate: '',
      completed: false,
      objective: '',
      score: 0
    }
  };

  let _save = null;

  function deepClone(obj) {
    return JSON.parse(JSON.stringify(obj));
  }

  /**
   * Load save from localStorage, merging with defaults for missing fields.
   * Handles corrupted data gracefully.
   */
  function load() {
    if (_save) return _save;
    let raw = null;
    try {
      raw = localStorage.getItem(STORAGE_KEY);
    } catch (e) {
      raw = null;
    }
    let parsed = null;
    if (raw) {
      try {
        parsed = JSON.parse(raw);
      } catch (e) {
        parsed = null;
      }
    }
    const merged = deepClone(DEFAULT_SAVE);
    if (parsed && typeof parsed === 'object') {
      for (const key of Object.keys(DEFAULT_SAVE)) {
        if (key in parsed) {
          if (key === 'settings' && parsed.settings && typeof parsed.settings === 'object') {
            merged.settings = Object.assign({}, DEFAULT_SAVE.settings, parsed.settings);
          } else if (key === 'achievements' && parsed.achievements && typeof parsed.achievements === 'object') {
            merged.achievements = Object.assign({}, parsed.achievements);
          } else if (key === 'daily' && parsed.daily && typeof parsed.daily === 'object') {
            merged.daily = Object.assign({}, DEFAULT_SAVE.daily, parsed.daily);
          } else if (typeof parsed[key] === typeof DEFAULT_SAVE[key]) {
            merged[key] = parsed[key];
          }
        }
      }
    }
    _save = merged;
    return _save;
  }

  /**
   * Persist current save to localStorage.
   */
  function persist() {
    if (!_save) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(_save));
    } catch (e) {
      // Storage full or unavailable — fail silently
    }
  }

  /**
   * Update one or more fields and persist.
   */
  function update(patch) {
    const save = load();
    Object.assign(save, patch);
    persist();
    return save;
  }

  /**
   * Update nested settings.
   */
  function updateSettings(patch) {
    const save = load();
    Object.assign(save.settings, patch);
    persist();
    return save.settings;
  }

  /**
   * Update achievements object.
   */
  function unlockAchievement(id) {
    const save = load();
    if (!save.achievements[id]) {
      save.achievements[id] = true;
      persist();
      return true;
    }
    return false;
  }

  /**
   * Record a completed game.
   */
  function recordGame({ score, level, words, longestWord, highestCombo }) {
    const save = load();
    save.gamesPlayed += 1;
    if (score > save.bestScore) save.bestScore = score;
    if (level > save.highestLevel) save.highestLevel = level;
    save.totalWords += words || 0;
    if (longestWord && longestWord.length > (save.longestWord || '').length) {
      save.longestWord = longestWord;
    }
    if (highestCombo > save.highestCombo) save.highestCombo = highestCombo;
    persist();
    return save;
  }

  /**
   * Reset all progress.
   */
  function resetProgress() {
    _save = deepClone(DEFAULT_SAVE);
    persist();
    return _save;
  }

  global.Storage = {
    load,
    persist,
    update,
    updateSettings,
    unlockAchievement,
    recordGame,
    resetProgress,
    DEFAULT_SAVE
  };
})(window);