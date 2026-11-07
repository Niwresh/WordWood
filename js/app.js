/* ============================================================
   WORDWOOD — Application bootstrap
   ============================================================ */
(function (global) {
  'use strict';

  function boot() {
    // Ensure all modules are loaded
    if (!global.CONFIG || !global.Dictionary || !global.Scoring ||
        !global.Board || !global.Storage || !global.Achievements ||
        !global.DailyChallenge || !global.UI || !global.Game) {
      console.error('Wordwood: missing module(s). Check script order.');
      return;
    }

    // Initialize UI + game
    global.UI.applySettings(global.Storage.load().settings);
    global.Game.init();

    // Global error safety
    window.addEventListener('error', (e) => {
      console.warn('Wordwood runtime warning:', e.message);
    });

    // Prevent double-tap zoom on iOS
    let lastTouch = 0;
    document.addEventListener('touchend', (e) => {
      const now = Date.now();
      if (now - lastTouch < 300) e.preventDefault();
      lastTouch = now;
    }, { passive: false });

    // Prevent pinch zoom on board
    document.addEventListener('gesturestart', (e) => {
      if (e.target.closest('.board')) e.preventDefault();
    });
  }

  // Run once DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})(window);