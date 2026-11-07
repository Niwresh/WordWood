/* ============================================================
   WORDWOOD — UI helpers: screens, toasts, particles, sounds
   ============================================================ */
(function (global) {
  'use strict';

  const screens = {};
  let currentScreen = 'screenMainMenu';

  // Web Audio API context
  let audioCtx = null;
  let settings = { sound: true, music: true, volume: 0.5 };

  function ensureAudio() {
    if (!audioCtx) {
      try {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      } catch (e) {
        audioCtx = null;
      }
    }
    if (audioCtx && audioCtx.state === 'suspended') {
      audioCtx.resume().catch(() => {});
    }
    return audioCtx;
  }

  /**
   * Play a simple tone. type: 'click' | 'success' | 'error' | 'combo' | 'level' | 'special' | 'fall'
   */
  function playSound(type) {
    if (!settings.sound) return;
    const ctx = ensureAudio();
    if (!ctx) return;
    const now = ctx.currentTime;
    const vol = settings.volume;

    function tone(freq, dur, wave = 'sine', gainVal = 0.15, delay = 0) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = wave;
      osc.frequency.setValueAtTime(freq, now + delay);
      gain.gain.setValueAtTime(0, now + delay);
      gain.gain.linearRampToValueAtTime(gainVal * vol, now + delay + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.001, now + delay + dur);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + delay);
      osc.stop(now + delay + dur + 0.05);
    }

    switch (type) {
      case 'click':
        tone(660, 0.06, 'sine', 0.08);
        break;
      case 'select':
        tone(880, 0.05, 'triangle', 0.06);
        break;
      case 'success':
        tone(523.25, 0.1, 'sine', 0.12);
        tone(659.25, 0.12, 'sine', 0.12, 0.08);
        tone(783.99, 0.18, 'sine', 0.12, 0.16);
        break;
      case 'error':
        tone(220, 0.15, 'sawtooth', 0.1);
        tone(164.81, 0.2, 'sawtooth', 0.1, 0.08);
        break;
      case 'combo':
        tone(783.99, 0.08, 'square', 0.08);
        tone(987.77, 0.1, 'square', 0.08, 0.06);
        break;
      case 'level':
        tone(523.25, 0.15, 'sine', 0.14);
        tone(659.25, 0.15, 'sine', 0.14, 0.12);
        tone(783.99, 0.15, 'sine', 0.14, 0.24);
        tone(1046.5, 0.3, 'sine', 0.14, 0.36);
        break;
      case 'special':
        tone(1046.5, 0.08, 'triangle', 0.1);
        tone(1318.5, 0.1, 'triangle', 0.1, 0.06);
        break;
      case 'fall':
        tone(330, 0.08, 'sine', 0.05);
        break;
      default:
        tone(440, 0.08, 'sine', 0.06);
    }
  }

  /**
   * Register a screen element by id.
   */
  function registerScreen(id) {
    const el = document.getElementById(id);
    if (el) screens[id] = el;
  }

  /**
   * Show a single screen, hide others.
   */
  function showScreen(id) {
    for (const key of Object.keys(screens)) {
      screens[key].classList.toggle('active', key === id);
    }
    currentScreen = id;
  }

  function getCurrentScreen() {
    return currentScreen;
  }

  /**
   * Show a toast message.
   */
  function toast(message, type = 'info', duration = 2500) {
    const container = document.getElementById('toastContainer');
    if (!container) return;
    const el = document.createElement('div');
    el.className = 'toast' + (type === 'success' ? ' success' : type === 'error' ? ' error' : '');
    el.textContent = message;
    container.appendChild(el);
    setTimeout(() => {
      if (el.parentNode) el.parentNode.removeChild(el);
    }, duration);
  }

  /**
   * Spawn particles at screen coordinates.
   */
  function spawnParticles(x, y, count = 12, colors = ['#e8c86a', '#ffdc7a', '#b8943a'], opts = {}) {
    const layer = document.getElementById('particleLayer');
    if (!layer) return;
    const { spread = 1, size = 6, life = 800 } = opts;
    for (let i = 0; i < count; i++) {
      const p = document.createElement('div');
      p.className = 'particle';
      const sz = size * (0.5 + Math.random() * 0.8);
      p.style.width = sz + 'px';
      p.style.height = sz + 'px';
      p.style.left = x + 'px';
      p.style.top = y + 'px';
      p.style.background = colors[Math.floor(Math.random() * colors.length)];
      layer.appendChild(p);

      const angle = Math.random() * Math.PI * 2;
      const dist = (30 + Math.random() * 70) * spread;
      const dx = Math.cos(angle) * dist;
      const dy = Math.sin(angle) * dist;
      const dur = life * (0.6 + Math.random() * 0.7);

      p.animate([
        { transform: 'translate(-50%, -50%) scale(1)', opacity: 1 },
        { transform: `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px)) scale(0)`, opacity: 0 }
      ], { duration: dur, easing: 'cubic-bezier(0.2, 0.6, 0.3, 1)' }).onfinish = () => {
        if (p.parentNode) p.parentNode.removeChild(p);
      };
    }
  }

  /**
   * Show a score popup at screen coordinates.
   */
  function scorePopup(x, y, text) {
    const layer = document.getElementById('particleLayer');
    if (!layer) return;
    const el = document.createElement('div');
    el.className = 'score-popup';
    el.textContent = text;
    el.style.left = x + 'px';
    el.style.top = y + 'px';
    layer.appendChild(el);
    setTimeout(() => {
      if (el.parentNode) el.parentNode.removeChild(el);
    }, 1000);
  }

  /**
   * Trigger a level celebration overlay.
   */
  function celebrate(text = '✨') {
    const layer = document.getElementById('particleLayer');
    if (!layer) return;
    const el = document.createElement('div');
    el.className = 'level-celebration';
    el.textContent = text;
    layer.appendChild(el);
    setTimeout(() => {
      if (el.parentNode) el.parentNode.removeChild(el);
    }, 1300);
  }

  /**
   * Apply settings to the UI (reduced motion class).
   */
  function applySettings(newSettings) {
    settings = Object.assign({}, settings, newSettings);
    document.body.classList.toggle('reduced-motion', !!settings.reducedMotion);
  }

  function getSettings() {
    return settings;
  }

  global.UI = {
    registerScreen,
    showScreen,
    getCurrentScreen,
    toast,
    spawnParticles,
    scorePopup,
    celebrate,
    playSound,
    applySettings,
    getSettings
  };
})(window);