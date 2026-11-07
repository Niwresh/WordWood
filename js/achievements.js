/* ============================================================
   WORDWOOD — Achievements definitions & checking
   ============================================================ */
(function (global) {
  'use strict';

  const ACHIEVEMENTS = [
    { id: 'firstWord', name: 'First Word', desc: 'Submit your first valid word', icon: '📝', check: (s) => s.totalWords >= 1 },
    { id: 'words100', name: '100 Words', desc: 'Submit 100 words total', icon: '💯', check: (s) => s.totalWords >= 100 },
    { id: 'word7', name: '7-Letter Word', desc: 'Submit a 7-letter word', icon: '🔠', check: (s) => (s.longestWord || '').length >= 7 },
    { id: 'word10', name: '10-Letter Word', desc: 'Submit a 10-letter word', icon: '🔟', check: (s) => (s.longestWord || '').length >= 10 },
    { id: 'combo5', name: 'Combo ×5', desc: 'Reach a combo of ×5', icon: '🔥', check: (s) => s.highestCombo >= 5 },
    { id: 'combo10', name: 'Combo ×10', desc: 'Reach a combo of ×10', icon: '⚡', check: (s) => s.highestCombo >= 10 },
    { id: 'score10000', name: '10,000 Points', desc: 'Score 10,000 in one game', icon: '💎', check: (s) => s.bestScore >= 10000 },
    { id: 'level25', name: '25 Levels', desc: 'Reach level 25', icon: '🏰', check: (s) => s.highestLevel >= 25 }
  ];

  /**
   * Check all achievements against current save. Returns newly unlocked IDs.
   */
  function checkAll(save) {
    const newly = [];
    for (const a of ACHIEVEMENTS) {
      if (!save.achievements[a.id] && a.check(save)) {
        save.achievements[a.id] = true;
        newly.push(a);
      }
    }
    return newly;
  }

  /**
   * Get list of achievements with unlocked state.
   */
  function list(save) {
    return ACHIEVEMENTS.map(a => ({
      ...a,
      unlocked: !!save.achievements[a.id]
    }));
  }

  global.Achievements = {
    ACHIEVEMENTS,
    checkAll,
    list
  };
})(window);