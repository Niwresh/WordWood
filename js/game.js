/* ============================================================
   WORDWOOD — Core game logic, state machine, interactions
   ============================================================ */
(function (global) {
  'use strict';

  const { ROWS, COLS, MIN_WORD_LENGTH, LEVELS, REFILL_DELAY } = global.CONFIG;
  const { Board, Tile } = global;
  const { Dictionary, Scoring, Storage, Achievements, DailyChallenge, UI } = global;

  // ---------- GAME STATE ----------
  const state = {
    board: null,
    level: 1,
    levelDef: LEVELS[0],
    score: 0,
    levelScore: 0,
    wordsThisLevel: 0,
    totalWordsThisGame: 0,
    combo: 1,
    maxCombo: 1,
    longestWord: '',
    isGameActive: false,
    isPaused: false,
    isProcessing: false,
    isDaily: false,
    dailyCompleted: false,
    dailyDateKey: '',
    // Track pending timeouts for cleanup
    timeouts: [],
    // Achievements for this game
    gameAchievements: new Set()
  };

  // DOM references (populated on init)
  let dom = {};

  function clearTimeouts() {
    for (const t of state.timeouts) clearTimeout(t);
    state.timeouts = [];
  }

  function schedule(fn, delay) {
    const t = setTimeout(fn, delay);
    state.timeouts.push(t);
    return t;
  }

  // ---------- DOM LOOKUP ----------
  function cacheDom() {
    dom = {
      boardEl: document.getElementById('board'),
      scoreDisplay: document.getElementById('scoreDisplay'),
      levelDisplay: document.getElementById('levelDisplay'),
      objectiveText: document.getElementById('objectiveText'),
      comboDisplay: document.getElementById('comboDisplay'),
      comboBox: document.getElementById('comboBox'),
      currentWord: document.getElementById('currentWord'),
      messageArea: document.getElementById('messageArea'),
      levelProgress: document.getElementById('levelProgress'),
      wordList: document.getElementById('wordList'),
      submitBtn: document.getElementById('submitBtn'),
      clearBtn: document.getElementById('clearBtn'),
      shuffleBtn: document.getElementById('shuffleBtn'),
      pauseBtn: document.getElementById('pauseBtn')
    };
  }

  // ---------- RENDERING ----------
  function renderBoard(animate = false, specificChanges = null) {
    if (!dom.boardEl || !state.board) return;
    const boardEl = dom.boardEl;
    boardEl.innerHTML = '';

    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const tile = state.board.getTile(r, c);
        const el = document.createElement('div');
        el.className = 'tile';
        el.dataset.r = r;
        el.dataset.c = c;
        el.setAttribute('role', 'gridcell');

        if (tile) {
          if (tile.special) {
            el.classList.add('special-' + tile.special);
            const icon = document.createElement('span');
            icon.className = 'special-indicator';
            icon.textContent = global.SpecialTiles.getIcon(tile.special);
            el.appendChild(icon);
          }
          const letterSpan = document.createElement('span');
          letterSpan.textContent = tile.isWildcard ? '★' : tile.letter;
          el.appendChild(letterSpan);
        }

        // Selected state
        const isSelected = state.board.selected.some(p => p.r === r && p.c === c);
        if (isSelected) el.classList.add('selected');

        if (animate && specificChanges) {
          if (specificChanges.newTiles && specificChanges.newTiles.some(p => p.r === r && p.c === c)) {
            el.classList.add('spawn');
          }
        }

        boardEl.appendChild(el);
      }
    }
  }

  function updateHUD() {
    if (dom.scoreDisplay) dom.scoreDisplay.textContent = Scoring.formatScore(state.score);
    if (dom.levelDisplay) dom.levelDisplay.textContent = state.level;
    if (dom.objectiveText) dom.objectiveText.textContent = state.levelDef.objectiveText;
    if (dom.comboDisplay) dom.comboDisplay.textContent = 'x' + state.combo;
    if (dom.comboBox) {
      dom.comboBox.classList.toggle('active', state.combo > 1);
    }
    // Level progress
    if (dom.levelProgress) {
      const target = state.levelDef.scoreTarget || 1;
      let progress;
      if (state.levelDef.objectiveType === 'score') {
        progress = Math.min(1, state.levelScore / target);
      } else if (state.levelDef.objectiveType === 'words') {
        progress = Math.min(1, state.wordsThisLevel / state.levelDef.objectiveValue);
      } else if (state.levelDef.objectiveType === 'longword') {
        const hasLong = state.longestWord.length >= state.levelDef.objectiveValue;
        progress = hasLong ? 1 : 0.4;
      } else if (state.levelDef.objectiveType === 'combo') {
        progress = Math.min(1, state.maxCombo / state.levelDef.objectiveValue);
      } else {
        progress = 0;
      }
      dom.levelProgress.style.width = (progress * 100) + '%';
    }
  }

  function updateCurrentWord() {
    if (!dom.currentWord || !state.board) return;
    const word = state.board.getCurrentWord();
    dom.currentWord.textContent = word || '...';
  }

  function setMessage(text, type = '') {
    if (!dom.messageArea) return;
    dom.messageArea.textContent = text;
    dom.messageArea.className = 'message-area' + (type ? ' ' + type : '');
    if (type === 'error') {
      dom.messageArea.classList.remove('error');
      void dom.messageArea.offsetWidth;
      dom.messageArea.classList.add('error');
    }
  }

  // ---------- BOARD INTERACTION ----------
  function getTileElement(r, c) {
    if (!dom.boardEl) return null;
    return dom.boardEl.querySelector(`.tile[data-r="${r}"][data-c="${c}"]`);
  }

  function getTileScreenPos(r, c) {
    const el = getTileElement(r, c);
    if (!el) return null;
    const rect = el.getBoundingClientRect();
    return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2, rect };
  }

  function onTileSelect(r, c) {
    if (!state.isGameActive || state.isPaused || state.isProcessing) return;
    if (!state.board) return;

    const success = state.board.select(r, c);
    if (success) {
      const el = getTileElement(r, c);
      if (el) {
        el.classList.add('selected');
        const pos = getTileScreenPos(r, c);
        if (pos) {
          UI.spawnParticles(pos.x, pos.y, 4, ['#e8c86a', '#ffdc7a'], { spread: 0.4, size: 4, life: 450 });
        }
      }
      UI.playSound('select');
      updateCurrentWord();
    }
  }

  function onTileDrag(r, c) {
    // Same as select, but only if not already selected
    if (!state.board) return;
    if (state.board.selected.some(p => p.r === r && p.c === c)) return;
    onTileSelect(r, c);
  }

  function clearSelection() {
    if (!state.board) return;
    state.board.clearSelection();
    const selectedEls = dom.boardEl.querySelectorAll('.tile.selected');
    selectedEls.forEach(el => el.classList.remove('selected'));
    updateCurrentWord();
    setMessage('');
  }

  // ---------- WORD SUBMISSION ----------
  function submitWord() {
    if (!state.isGameActive || state.isPaused || state.isProcessing) return;
    if (!state.board) return;

    const selected = state.board.selected;
    if (selected.length < MIN_WORD_LENGTH) {
      setMessage(`Need at least ${MIN_WORD_LENGTH} letters`, 'error');
      UI.playSound('error');
      shakeSelection();
      return;
    }

    const rawWord = state.board.getCurrentWord();

    // Handle wildcards: replace '?' with a letter that forms a valid word
    const resolvedWord = resolveWildcards(rawWord, selected);

    if (!resolvedWord) {
      setMessage('Not a word', 'error');
      UI.playSound('error');
      resetCombo();
      shakeSelection();
      schedule(() => clearSelection(), 400);
      return;
    }

    const word = resolvedWord.toLowerCase();

    if (!Dictionary.isValidWord(word)) {
      setMessage('Not a word', 'error');
      UI.playSound('error');
      resetCombo();
      shakeSelection();
      schedule(() => clearSelection(), 400);
      return;
    }

    // Valid word!
    state.isProcessing = true;
    const selectionInfo = state.board.getSelectionInfo();
    const { goldBonus, starMultiplier, bombPositions } = selectionInfo;

    // Calculate score
    const wordScore = Scoring.calculateWordScore(word, state.combo, starMultiplier, goldBonus);
    state.score += wordScore;
    state.levelScore += wordScore;
    state.wordsThisLevel += 1;
    state.totalWordsThisGame += 1;
    state.maxCombo = Math.max(state.maxCombo, state.combo);

    if (word.length > state.longestWord.length) {
      state.longestWord = word;
    }

    // Visual feedback: score popup
    const lastPos = selected[selected.length - 1];
    const screenPos = getTileScreenPos(lastPos.r, lastPos.c);
    if (screenPos) {
      UI.scorePopup(screenPos.x, screenPos.y, '+' + wordScore);
      const colors = ['#ffdc7a', '#e8c86a', '#6ecf8f', '#80e0ff'];
      UI.spawnParticles(screenPos.x, screenPos.y, 18, colors, { spread: 1.2, size: 7, life: 900 });
    }

    // Sound
    UI.playSound('success');
    if (state.combo > 1) UI.playSound('combo');

    // Show word in list
    addWordToList(resolvedWord, wordScore);

    // Animate destruction
    const positionsToRemove = [...selected];
    // Add bomb affected tiles
    for (const bp of bombPositions) {
      const affected = state.board.getBombAffected(bp);
      for (const a of affected) {
        if (!positionsToRemove.some(p => p.r === a.r && p.c === a.c)) {
          positionsToRemove.push(a);
        }
      }
    }

    // Mark tiles for destruction animation
    for (const p of positionsToRemove) {
      const el = getTileElement(p.r, p.c);
      if (el) el.classList.add('destroy');
    }

    UI.playSound('fall');

    // After destruction, remove, apply gravity, refill
    schedule(() => {
      state.board.clearSelection();
      state.board.removeTiles(positionsToRemove);

      // Apply gravity and refill
      const fallMoves = state.board.applyGravity();
      const newTiles = state.board.refill(state.levelDef);

      // Re-render with animations
      renderBoard(true, { newTiles });

      updateHUD();
      updateCurrentWord();
      state.isProcessing = false;

      // Increase combo
      state.combo = Math.min(state.combo + 1, global.CONFIG.COMBO_MULTIPLIERS.length - 1);
      updateHUD();

      // Check level objective
      checkLevelObjective();

    }, 360);
  }

  /**
   * Resolve wildcard letters. Tries each possible letter for each '?'.
   * Returns a valid word string or null.
   */
  function resolveWildcards(rawWord, selected) {
    const wildcardIndices = [];
    for (let i = 0; i < rawWord.length; i++) {
      if (rawWord[i] === '?') wildcardIndices.push(i);
    }
    if (wildcardIndices.length === 0) return rawWord;

    // Try letters a-z for each wildcard, prioritizing common letters
    const alphabet = 'etaoinshrdlucmfwypvbgkjqxz'.split('');
    const maxTries = Math.min(Math.pow(26, wildcardIndices.length), 5000);

    // If too many wildcards, just try 'e' as a fallback
    if (wildcardIndices.length > 3) {
      let candidate = rawWord;
      for (const idx of wildcardIndices) {
        candidate = candidate.substring(0, idx) + 'e' + candidate.substring(idx + 1);
      }
      return Dictionary.isValidWord(candidate.toLowerCase()) ? candidate : null;
    }

    // Recursive search with pruning
    function search(pos, current) {
      if (pos === wildcardIndices.length) {
        const candidate = current.toLowerCase();
        return Dictionary.isValidWord(candidate) ? current : null;
      }
      const idx = wildcardIndices[pos];
      for (const letter of alphabet) {
        const next = current.substring(0, idx) + letter + current.substring(idx + 1);
        const result = search(pos + 1, next);
        if (result) return result;
      }
      return null;
    }

    return search(0, rawWord);
  }

  function shakeSelection() {
    const selectedEls = dom.boardEl.querySelectorAll('.tile.selected');
    selectedEls.forEach(el => {
      el.classList.add('invalid-shake');
      setTimeout(() => el.classList.remove('invalid-shake'), 400);
    });
  }

  function resetCombo() {
    state.combo = 1;
    updateHUD();
  }

  function addWordToList(word, score) {
    if (!dom.wordList) return;
    const li = document.createElement('li');
    li.textContent = `${word} (+${score})`;
    dom.wordList.prepend(li);
    // Limit to 30 entries
    while (dom.wordList.children.length > 30) {
      dom.wordList.removeChild(dom.wordList.lastChild);
    }
  }

  // ---------- LEVEL OBJECTIVE CHECK ----------
  function checkLevelObjective() {
    const def = state.levelDef;
    let complete = false;

    if (def.objectiveType === 'score') {
      complete = state.levelScore >= def.objectiveValue;
    } else if (def.objectiveType === 'words') {
      complete = state.wordsThisLevel >= def.objectiveValue;
    } else if (def.objectiveType === 'longword') {
      complete = state.longestWord.length >= def.objectiveValue;
    } else if (def.objectiveType === 'combo') {
      complete = state.maxCombo >= def.objectiveValue;
    }

    if (complete) {
      levelComplete();
    }
  }

  function levelComplete() {
    state.isGameActive = false;
    state.isProcessing = true;
    clearTimeouts();

    UI.playSound('level');
    UI.celebrate('🌟');

    // Save progress
    const save = Storage.load();
    if (state.score > save.bestScore) save.bestScore = state.score;
    if (state.level > save.highestLevel) save.highestLevel = state.level;
    Storage.update({ bestScore: save.bestScore, highestLevel: save.highestLevel });

    // Populate complete screen
    const completeScore = document.getElementById('completeScore');
    const completeWords = document.getElementById('completeWords');
    const completeCombo = document.getElementById('completeCombo');
    if (completeScore) completeScore.textContent = Scoring.formatScore(state.score);
    if (completeWords) completeWords.textContent = state.totalWordsThisGame;
    if (completeCombo) completeCombo.textContent = 'x' + state.maxCombo;

    // Check achievements
    const newAch = Achievements.checkAll(save);
    Storage.persist();
    if (newAch.length > 0) {
      for (const a of newAch) {
        schedule(() => UI.toast(`🏆 ${a.name} unlocked!`, 'success'), 500);
      }
    }

    schedule(() => {
      UI.showScreen('screenLevelComplete');
    }, 600);
  }

  // ---------- GAME FLOW ----------
  function startGame(level = 1, isDaily = false, dailyBoardData = null) {
    clearTimeouts();
    state.isGameActive = true;
    state.isPaused = false;
    state.isProcessing = false;
    state.isDaily = isDaily;
    state.level = level;
    state.levelDef = Board.getLevelDef(level);
    state.score = 0;
    state.levelScore = 0;
    state.wordsThisLevel = 0;
    state.totalWordsThisGame = 0;
    state.combo = 1;
    state.maxCombo = 1;
    state.longestWord = '';
    state.gameAchievements = new Set();

    if (dom.wordList) dom.wordList.innerHTML = '';

    if (isDaily && dailyBoardData) {
      state.board = Board.deserialize(dailyBoardData);
      state.dailyCompleted = false;
    } else {
      state.board = new Board();
    }

    renderBoard();
    updateHUD();
    updateCurrentWord();
    setMessage('');
    UI.showScreen('screenGame');

    // Update menu display
    const menuBest = document.getElementById('menuBestScore');
    const menuLevel = document.getElementById('menuHighestLevel');
    const save = Storage.load();
    if (menuBest) menuBest.textContent = Scoring.formatScore(save.bestScore);
    if (menuLevel) menuLevel.textContent = save.highestLevel;
  }

  function nextLevel() {
    const next = state.level + 1;
    startGame(next, false);
  }

  function pauseGame() {
    if (!state.isGameActive || state.isPaused) return;
    state.isPaused = true;
    UI.showScreen('screenPause');
  }

  function resumeGame() {
    if (!state.isPaused) return;
    state.isPaused = false;
    UI.showScreen('screenGame');
  }

  function restartGame() {
    startGame(1, false);
  }

  function quitToMenu() {
    clearTimeouts();
    state.isGameActive = false;
    state.isPaused = false;
    state.isProcessing = false;
    state.board = null;

    // Check achievements on quit
    const save = Storage.load();
    Achievements.checkAll(save);
    Storage.persist();

    UI.showScreen('screenMainMenu');
  }

  function gameOver(reason) {
    if (!state.isGameActive) return;
    state.isGameActive = false;
    state.isProcessing = true;
    clearTimeouts();

    UI.playSound('error');

    const save = Storage.load();
    // Record game stats
    save.gamesPlayed += 1;
    save.totalWords += state.totalWordsThisGame;
    if (state.score > save.bestScore) save.bestScore = state.score;
    if (state.longestWord.length > (save.longestWord || '').length) {
      save.longestWord = state.longestWord;
    }
    if (state.maxCombo > save.highestCombo) save.highestCombo = state.maxCombo;
    Storage.persist();

    // Check achievements
    const newAch = Achievements.checkAll(save);
    Storage.persist();

    // Fill game over screen
    const overScore = document.getElementById('overScore');
    const overWords = document.getElementById('overWords');
    const overLevel = document.getElementById('overLevel');
    const overReason = document.getElementById('gameOverReason');
    if (overScore) overScore.textContent = Scoring.formatScore(state.score);
    if (overWords) overWords.textContent = state.totalWordsThisGame;
    if (overLevel) overLevel.textContent = state.level;
    if (overReason) overReason.textContent = reason || 'The library closes...';

    for (const a of newAch) {
      schedule(() => UI.toast(`🏆 ${a.name} unlocked!`, 'success'), 600);
    }

    schedule(() => {
      UI.showScreen('screenGameOver');
    }, 500);
  }

  // ---------- SHUFFLE ----------
  function shuffleBoard() {
    if (!state.isGameActive || state.isPaused || state.isProcessing) return;
    if (!state.board) return;
    if (state.score < 50) {
      setMessage('Need 50 points to shuffle', 'error');
      return;
    }
    state.score -= 50;
    state.levelScore = Math.max(0, state.levelScore - 50);
    updateHUD();

    // Collect all tiles, shuffle
    const tiles = [];
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const t = state.board.getTile(r, c);
        if (t) tiles.push(t);
      }
    }
    for (let i = tiles.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [tiles[i], tiles[j]] = [tiles[j], tiles[i]];
    }
    let idx = 0;
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        if (state.board.getTile(r, c)) {
          state.board.grid[r][c] = tiles[idx++];
        }
      }
    }
    clearSelection();
    renderBoard(true);
    UI.playSound('click');
    setMessage('Board shuffled (-50 points)');
  }

  // ---------- EVENT BINDINGS ----------
  let isPointerDown = false;
  let pointerStart = null;

  function bindBoardEvents() {
    if (!dom.boardEl) return;

    const getTileFromEvent = (e) => {
      const target = e.target.closest('.tile');
      if (!target) return null;
      const r = parseInt(target.dataset.r, 10);
      const c = parseInt(target.dataset.c, 10);
      if (isNaN(r) || isNaN(c)) return null;
      return { r, c, el: target };
    };

    dom.boardEl.addEventListener('pointerdown', (e) => {
      if (!state.isGameActive || state.isPaused || state.isProcessing) return;
      e.preventDefault();
      const tile = getTileFromEvent(e);
      if (!tile) return;
      isPointerDown = true;
      pointerStart = tile;
      onTileSelect(tile.r, tile.c);
      // Capture pointer for drag
      if (dom.boardEl.setPointerCapture) {
        try { dom.boardEl.setPointerCapture(e.pointerId); } catch (err) {}
      }
    });

    dom.boardEl.addEventListener('pointermove', (e) => {
      if (!isPointerDown) return;
      if (!state.isGameActive || state.isPaused || state.isProcessing) return;
      e.preventDefault();
      const tile = getTileFromEvent(e);
      if (!tile) return;
      onTileDrag(tile.r, tile.c);
    });

    const endPointer = (e) => {
      if (!isPointerDown) return;
      isPointerDown = false;
      pointerStart = null;
      // On pointer up, don't auto-submit; user must press Submit
    };

    dom.boardEl.addEventListener('pointerup', endPointer);
    dom.boardEl.addEventListener('pointercancel', endPointer);
    dom.boardEl.addEventListener('pointerleave', (e) => {
      // Don't cancel on leave; user may re-enter
    });

    // Prevent context menu on long press
    dom.boardEl.addEventListener('contextmenu', (e) => e.preventDefault());

    // Prevent scrolling while interacting with board
    dom.boardEl.addEventListener('touchmove', (e) => {
      if (isPointerDown) e.preventDefault();
    }, { passive: false });
  }

  function bindControlEvents() {
    if (dom.submitBtn) dom.submitBtn.addEventListener('click', submitWord);
    if (dom.clearBtn) dom.clearBtn.addEventListener('click', clearSelection);
    if (dom.shuffleBtn) dom.shuffleBtn.addEventListener('click', shuffleBoard);
    if (dom.pauseBtn) dom.pauseBtn.addEventListener('click', pauseGame);
  }

  function bindKeyboard() {
    document.addEventListener('keydown', (e) => {
      const screen = UI.getCurrentScreen();
      if (screen === 'screenGame') {
        if (e.key === 'Enter') { e.preventDefault(); submitWord(); }
        else if (e.key === 'Escape' || e.key === 'p' || e.key === 'P') { e.preventDefault(); pauseGame(); }
        else if (e.key === 'Backspace') { e.preventDefault(); clearSelection(); }
        else if (e.key === 'r' || e.key === 'R') { e.preventDefault(); restartGame(); }
      } else if (screen === 'screenPause') {
        if (e.key === 'Escape' || e.key === 'p' || e.key === 'P') { e.preventDefault(); resumeGame(); }
        else if (e.key === 'r' || e.key === 'R') { e.preventDefault(); restartGame(); }
      }
    });
  }

  function bindScreenButtons() {
    const bind = (id, fn) => {
      const el = document.getElementById(id);
      if (el) el.addEventListener('click', fn);
    };

    // Main menu
    bind('btnPlay', () => startGame(Storage.load().highestLevel || 1, false));
    bind('btnDaily', showDailyScreen);
    bind('btnHowTo', () => UI.showScreen('screenHowTo'));
    bind('btnAchievements', showAchievementsScreen);
    bind('btnStats', showStatsScreen);
    bind('btnSettings', showSettingsScreen);

    // Pause
    bind('btnResume', resumeGame);
    bind('btnRestart', restartGame);
    bind('btnQuit', quitToMenu);

    // Level complete
    bind('btnNextLevel', nextLevel);
    bind('btnCompleteQuit', quitToMenu);

    // Game over
    bind('btnPlayAgain', () => startGame(1, false));
    bind('btnOverMenu', quitToMenu);

    // Back buttons
    bind('btnHowToBack', () => UI.showScreen('screenMainMenu'));
    bind('btnAchievementsBack', () => UI.showScreen('screenMainMenu'));
    bind('btnStatsBack', () => UI.showScreen('screenMainMenu'));
    bind('btnSettingsBack', () => UI.showScreen('screenMainMenu'));
    bind('btnDailyBack', () => UI.showScreen('screenMainMenu'));

    // Daily start
    bind('btnDailyStart', () => {
      const key = DailyChallenge.todayKey();
      const boardData = DailyChallenge.generateBoard(key);
      startGame(1, true, boardData);
      state.dailyDateKey = key;
      state.dailyCompleted = false;
      // Set objective from daily
      const obj = DailyChallenge.generateObjective(key);
      state.levelDef = {
        ...state.levelDef,
        objectiveType: obj.type,
        objectiveValue: obj.value,
        objectiveText: obj.text,
        scoreTarget: obj.type === 'score' ? obj.value : 999999
      };
      updateHUD();
    });
  }

  // ---------- SCREEN POPULATORS ----------
  function showAchievementsScreen() {
    const save = Storage.load();
    const list = Achievements.list(save);
    const el = document.getElementById('achievementList');
    if (!el) return;
    el.innerHTML = '';
    for (const a of list) {
      const li = document.createElement('li');
      li.className = 'achievement-item' + (a.unlocked ? ' unlocked' : '');
      li.innerHTML = `
        <span class="ach-icon">${a.icon}</span>
        <div class="ach-info">
          <div class="ach-name">${a.name}</div>
          <div class="ach-desc">${a.desc}</div>
        </div>
        <span class="ach-state">${a.unlocked ? '✓' : '🔒'}</span>
      `;
      el.appendChild(li);
    }
    UI.showScreen('screenAchievements');
  }

  function showStatsScreen() {
    const save = Storage.load();
    const set = (id, val) => {
      const el = document.getElementById(id);
      if (el) el.textContent = val;
    };
    set('statBestScore', Scoring.formatScore(save.bestScore));
    set('statHighestLevel', save.highestLevel);
    set('statGamesPlayed', save.gamesPlayed);
    set('statTotalWords', save.totalWords);
    set('statLongestWord', save.longestWord || '—');
    set('statHighestCombo', 'x' + save.highestCombo);
    UI.showScreen('screenStats');
  }

  function showSettingsScreen() {
    const save = Storage.load();
    const s = save.settings;
    const soundEl = document.getElementById('settingSound');
    const musicEl = document.getElementById('settingMusic');
    const volEl = document.getElementById('settingVolume');
    const motionEl = document.getElementById('settingReducedMotion');
    if (soundEl) soundEl.checked = !!s.sound;
    if (musicEl) musicEl.checked = !!s.music;
    if (volEl) volEl.value = s.volume;
    if (motionEl) motionEl.checked = !!s.reducedMotion;

    // Bind changes
    const updateSetting = (key, value) => {
      Storage.updateSettings({ [key]: value });
      UI.applySettings(Storage.load().settings);
    };

    if (soundEl) soundEl.onchange = () => updateSetting('sound', soundEl.checked);
    if (musicEl) musicEl.onchange = () => updateSetting('music', musicEl.checked);
    if (volEl) volEl.oninput = () => updateSetting('volume', parseFloat(volEl.value));
    if (motionEl) motionEl.onchange = () => updateSetting('reducedMotion', motionEl.checked);

    const resetBtn = document.getElementById('btnResetProgress');
    if (resetBtn) {
      resetBtn.onclick = () => {
        if (confirm('Reset all progress? This cannot be undone.')) {
          Storage.resetProgress();
          UI.toast('Progress reset', 'success');
          UI.applySettings(Storage.load().settings);
          showSettingsScreen();
        }
      };
    }

    UI.showScreen('screenSettings');
  }

  function showDailyScreen() {
    const save = Storage.load();
    const info = DailyChallenge.getInfo(save);
    const dateEl = document.getElementById('dailyDate');
    const objEl = document.getElementById('dailyObjective');
    const statusEl = document.getElementById('dailyStatus');
    if (dateEl) dateEl.textContent = info.dateDisplay;
    if (objEl) objEl.textContent = info.objective.text;
    if (statusEl) {
      statusEl.textContent = info.completed ? '✓ Completed' : (info.score > 0 ? `In progress (${info.score} pts)` : 'Not started');
      statusEl.style.color = info.completed ? '#4a7a2a' : '';
    }
    UI.showScreen('screenDaily');
  }

  // ---------- INIT ----------
  function init() {
    cacheDom();
    // Register screens
    const screenIds = [
      'screenMainMenu', 'screenGame', 'screenPause', 'screenLevelComplete',
      'screenGameOver', 'screenHowTo', 'screenAchievements', 'screenStats',
      'screenSettings', 'screenDaily'
    ];
    for (const id of screenIds) UI.registerScreen(id);

    // Apply saved settings
    const save = Storage.load();
    UI.applySettings(save.settings);

    // Bind all events
    bindBoardEvents();
    bindControlEvents();
    bindKeyboard();
    bindScreenButtons();

    // Update menu display
    const menuBest = document.getElementById('menuBestScore');
    const menuLevel = document.getElementById('menuHighestLevel');
    if (menuBest) menuBest.textContent = Scoring.formatScore(save.bestScore);
    if (menuLevel) menuLevel.textContent = save.highestLevel;

    // Show main menu
    UI.showScreen('screenMainMenu');

    // Initial score display
    if (dom.scoreDisplay) dom.scoreDisplay.textContent = '0';
  }

  // Expose for app.js
  global.Game = {
    init,
    startGame,
    state,
    submitWord,
    clearSelection,
    pauseGame,
    resumeGame,
    restartGame,
    quitToMenu,
    shuffleBoard,
    showDailyScreen,
    showAchievementsScreen,
    showStatsScreen,
    showSettingsScreen
  };
})(window);