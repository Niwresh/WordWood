/* ============================================================
   WORDWOOD — Configuration & constants
   ============================================================ */
(function (global) {
  'use strict';

  const CONFIG = {
    // Board dimensions
    ROWS: 10,
    COLS: 8,

    // Word rules
    MIN_WORD_LENGTH: 3,
    MAX_WORD_LENGTH: 12,

    // Scoring
    LETTER_VALUES: {
      A: 1, B: 3, C: 3, D: 2, E: 1, F: 4, G: 2, H: 4, I: 1, J: 8,
      K: 5, L: 1, M: 3, N: 1, O: 1, P: 3, Q: 10, R: 1, S: 1, T: 1,
      U: 1, V: 4, W: 4, X: 8, Y: 4, Z: 10
    },

    // Word length bonus multipliers (index = word length)
    LENGTH_BONUS: {
      3: 1,
      4: 1.5,
      5: 2.2,
      6: 3,
      7: 4,
      8: 5.5,
      9: 7,
      10: 9,
      11: 11,
      12: 14
    },

    // Combo multipliers by combo level
    COMBO_MULTIPLIERS: [1, 1, 2, 3, 4, 5, 6, 8, 10, 12, 15, 20],

    // Letter distribution (weighted toward common letters)
    LETTER_POOL: (
      'AAAAAAAAA' + 'BB' + 'CC' + 'DDDD' + 'EEEEEEEEEEEE' +
      'FF' + 'GGG' + 'HHH' + 'IIIIIIIII' + 'J' + 'K' +
      'LLLLL' + 'MMM' + 'NNNNNN' + 'OOOOOOOO' + 'PP' +
      'Q' + 'RRRRRR' + 'SSSSSS' + 'TTTTTTTT' + 'UUUU' +
      'VV' + 'WW' + 'X' + 'YY' + 'Z'
    ).split(''),

    // Level definitions
    LEVELS: [
      {
        level: 1,
        name: 'The Reading Nook',
        scoreTarget: 1000,
        objectiveType: 'score',
        objectiveValue: 1000,
        objectiveText: 'Score 1,000 points',
        dangerLevel: 0.0,
        specialChance: 0.05
      },
      {
        level: 2,
        name: 'Dusty Shelves',
        scoreTarget: 2500,
        objectiveType: 'score',
        objectiveValue: 2500,
        objectiveText: 'Score 2,500 points',
        dangerLevel: 0.05,
        specialChance: 0.08
      },
      {
        level: 3,
        name: 'Whispering Stacks',
        scoreTarget: 4000,
        objectiveType: 'words',
        objectiveValue: 10,
        objectiveText: 'Create 10 words',
        dangerLevel: 0.08,
        specialChance: 0.1
      },
      {
        level: 4,
        name: 'The Scriptorium',
        scoreTarget: 6000,
        objectiveType: 'score',
        objectiveValue: 6000,
        objectiveText: 'Score 6,000 points',
        dangerLevel: 0.1,
        specialChance: 0.12
      },
      {
        level: 5,
        name: 'Arcane Archive',
        scoreTarget: 8000,
        objectiveType: 'longword',
        objectiveValue: 6,
        objectiveText: 'Create a 6-letter word',
        dangerLevel: 0.12,
        specialChance: 0.14
      },
      {
        level: 6,
        name: 'The Gilded Gallery',
        scoreTarget: 10000,
        objectiveType: 'combo',
        objectiveValue: 5,
        objectiveText: 'Reach Combo x5',
        dangerLevel: 0.15,
        specialChance: 0.16
      },
      {
        level: 7,
        name: 'Forbidden Wing',
        scoreTarget: 13000,
        objectiveType: 'score',
        objectiveValue: 13000,
        objectiveText: 'Score 13,000 points',
        dangerLevel: 0.18,
        specialChance: 0.18
      },
      {
        level: 8,
        name: 'The Oracle\'s Desk',
        scoreTarget: 16000,
        objectiveType: 'words',
        objectiveValue: 20,
        objectiveText: 'Create 20 words',
        dangerLevel: 0.2,
        specialChance: 0.2
      },
      {
        level: 9,
        name: 'Moonlit Manuscripts',
        scoreTarget: 20000,
        objectiveType: 'longword',
        objectiveValue: 7,
        objectiveText: 'Create a 7-letter word',
        dangerLevel: 0.22,
        specialChance: 0.22
      },
      {
        level: 10,
        name: 'The Verdant Heart',
        scoreTarget: 25000,
        objectiveType: 'combo',
        objectiveValue: 6,
        objectiveText: 'Reach Combo x6',
        dangerLevel: 0.25,
        specialChance: 0.25
      }
    ],

    // Special tile configuration
    SPECIAL_TILES: {
      gold: {
        icon: '🟡',
        name: 'Gold',
        bonusPoints: 50,
        unlockLevel: 1
      },
      rainbow: {
        icon: '🌈',
        name: 'Rainbow',
        unlockLevel: 3
      },
      bomb: {
        icon: '💣',
        name: 'Bomb',
        unlockLevel: 4
      },
      star: {
        icon: '⭐',
        name: 'Star',
        multiplier: 2,
        unlockLevel: 5
      },
      danger: {
        icon: '💀',
        name: 'Danger',
        unlockLevel: 6
      }
    },

    // Timing
    REFILL_DELAY: 280,
    DESTROY_DURATION: 350,
    MESSAGE_DURATION: 1800,
    TOAST_DURATION: 2500,

    // Storage keys
    STORAGE_KEY: 'wordwood_save_v1',

    // Difficulty: at higher levels, extra random letters get placed
    DIFFICULTY_JUNK_CHANCE: [0, 0.02, 0.04, 0.06, 0.08, 0.1, 0.12, 0.14, 0.16, 0.18]
  };

  // Freeze to prevent accidental mutation
  Object.freeze(CONFIG.LETTER_VALUES);
  Object.freeze(CONFIG.LENGTH_BONUS);
  Object.freeze(CONFIG.COMBO_MULTIPLIERS);
  Object.freeze(CONFIG.SPECIAL_TILES);
  Object.freeze(CONFIG.LEVELS);
  Object.freeze(CONFIG);

  global.CONFIG = CONFIG;
})(window);