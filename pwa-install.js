/* ============================================================
   NoxBuddy — PWA Install Manager (pwa-install.js)
   Universal install prompt handler for Android, iOS & Desktop
   ============================================================ */

(function () {
  "use strict";

  let deferredPrompt = null;

  // Detect standalone mode (already installed & running as app)
  const isStandalone =
    window.matchMedia("(display-mode: standalone)").matches ||
    window.navigator.standalone === true ||
    document.referrer.includes("android-app://");

  // Detect iOS Safari
  const isIOS =
    /iPad|iPhone|iPod/.test(navigator.userAgent) &&
    !window.MSStream;

  // Detect Android
  const isAndroid = /Android/.test(navigator.userAgent);

  /* ── DOM READY INITIALIZATION ── */
  function init() {
    if (isStandalone) {
      // User is already using the installed PWA
      hideAllInstallButtons();
      return;
    }

    // Always show install buttons on mobile/tablet or when prompt ready
    showAllInstallButtons();

    // Attach click listeners to all install buttons
    attachButtonListeners();

    // Listen for browser install prompt
    window.addEventListener("beforeinstallprompt", (e) => {
      e.preventDefault();
      deferredPrompt = e;
      showAllInstallButtons();
    });

    // Listen for successful install
    window.addEventListener("appinstalled", () => {
      deferredPrompt = null;
      markAsInstalled();
      closeModal();
    });
  }

  function showAllInstallButtons() {
    if (isStandalone) return;
    const buttons = document.querySelectorAll(".pwa-install-btn");
    buttons.forEach((btn) => {
      if (btn.tagName.toLowerCase() === "button" || btn.tagName.toLowerCase() === "a") {
        btn.style.removeProperty("display");
        if (getComputedStyle(btn).display === "none") {
          btn.style.display = "inline-flex";
        }
      }
    });
  }

  function hideAllInstallButtons() {
    const buttons = document.querySelectorAll(".pwa-install-btn");
    buttons.forEach((btn) => {
      btn.style.display = "none";
    });
  }

  function markAsInstalled() {
    const buttons = document.querySelectorAll(".pwa-install-btn");
    buttons.forEach((btn) => {
      btn.classList.add("installed");
      btn.innerHTML = `
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="20 6 9 17 4 12"/></svg>
        <span>App Installed</span>
      `;
    });
  }

  function attachButtonListeners() {
    document.addEventListener("click", (e) => {
      const btn = e.target.closest(".pwa-install-btn");
      if (!btn) return;

      e.preventDefault();
      handleInstallClick();
    });
  }

  /* ── INSTALL CLICK HANDLER ── */
  async function handleInstallClick() {
    // 1. If native beforeinstallprompt is available (Chrome, Edge, Android Chrome)
    if (deferredPrompt) {
      try {
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        if (outcome === "accepted") {
          markAsInstalled();
        }
        deferredPrompt = null;
        return;
      } catch (err) {
        console.warn("Install prompt error:", err);
      }
    }

    // 2. If iOS Safari or beforeinstallprompt is not supported / pending
    openModal();
  }

  /* ── INSTRUCTIONS MODAL ── */
  function ensureModalExists() {
    let backdrop = document.getElementById("pwaInstallModalBackdrop");
    if (backdrop) return backdrop;

    backdrop = document.createElement("div");
    backdrop.id = "pwaInstallModalBackdrop";
    backdrop.className = "pwa-install-modal-backdrop";
    backdrop.setAttribute("role", "dialog");
    backdrop.setAttribute("aria-modal", "true");
    backdrop.setAttribute("aria-labelledby", "pwaModalTitle");

    let instructionsHtml = "";

    if (isIOS) {
      instructionsHtml = `
        <p class="pwa-modal-intro">Install NoxBuddy on your iPhone or iPad for a distraction-free, full-screen study desk:</p>
        <ul class="pwa-steps-list">
          <li class="pwa-step-item">
            <span class="pwa-step-num">1</span>
            <div class="pwa-step-text">
              Tap the <strong>Share</strong> button
              <svg class="pwa-step-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><polyline points="16 6 12 2 8 6"/><line x1="12" y1="2" x2="12" y2="15"/></svg>
              in Safari's bottom toolbar.
            </div>
          </li>
          <li class="pwa-step-item">
            <span class="pwa-step-num">2</span>
            <div class="pwa-step-text">
              Scroll down the menu and tap <strong>Add to Home Screen</strong>
              <svg class="pwa-step-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/></svg>.
            </div>
          </li>
          <li class="pwa-step-item">
            <span class="pwa-step-num">3</span>
            <div class="pwa-step-text">
              Tap <strong>Add</strong> in the top right. NoxBuddy will now live right on your home screen!
            </div>
          </li>
        </ul>
      `;
    } else if (isAndroid) {
      instructionsHtml = `
        <p class="pwa-modal-intro">Add NoxBuddy to your Android home screen for instant, offline-ready study sessions:</p>
        <ul class="pwa-steps-list">
          <li class="pwa-step-item">
            <span class="pwa-step-num">1</span>
            <div class="pwa-step-text">
              Tap the <strong>three dots menu (⋮)</strong> in your browser's top right corner.
            </div>
          </li>
          <li class="pwa-step-item">
            <span class="pwa-step-num">2</span>
            <div class="pwa-step-text">
              Select <strong>Install app</strong> or <strong>Add to Home screen</strong>.
            </div>
          </li>
          <li class="pwa-step-item">
            <span class="pwa-step-num">3</span>
            <div class="pwa-step-text">
              Confirm by tapping <strong>Install</strong>. NoxBuddy will install as a native-feel web app.
            </div>
          </li>
        </ul>
      `;
    } else {
      instructionsHtml = `
        <p class="pwa-modal-intro">Install NoxBuddy on your computer for quick access and full-screen focus:</p>
        <ul class="pwa-steps-list">
          <li class="pwa-step-item">
            <span class="pwa-step-num">1</span>
            <div class="pwa-step-text">
              Look for the <strong>Install icon</strong> in your browser address bar (top right in Chrome/Edge).
            </div>
          </li>
          <li class="pwa-step-item">
            <span class="pwa-step-num">2</span>
            <div class="pwa-step-text">
              Or click the browser menu (<strong>⋮</strong> or <strong>…</strong>) and select <strong>Install NoxBuddy</strong>.
            </div>
          </li>
          <li class="pwa-step-item">
            <span class="pwa-step-num">3</span>
            <div class="pwa-step-text">
              Launch directly from your desktop, taskbar, or launchpad.
            </div>
          </li>
        </ul>
      `;
    }

    // Determine correct relative path to icons
    const isSubdir = window.location.pathname.includes("/pawmo/") ||
                     window.location.pathname.includes("/planr/") ||
                     window.location.pathname.includes("/pebble/") ||
                     window.location.pathname.includes("/pixel/");
    const iconPath = isSubdir ? "../icons/icon-192.png" : "./icons/icon-192.png";

    backdrop.innerHTML = `
      <div class="pwa-install-modal">
        <div class="pwa-modal-header">
          <div class="pwa-modal-title-wrap">
            <div class="pwa-modal-app-icon">
              <img src="${iconPath}" alt="NoxBuddy Logo" width="32" height="32" onerror="this.style.display='none'">
            </div>
            <div>
              <h3 class="pwa-modal-title" id="pwaModalTitle">Install NoxBuddy</h3>
              <p class="pwa-modal-subtitle">Your quiet digital study desk</p>
            </div>
          </div>
          <button class="pwa-modal-close" id="pwaModalCloseBtn" aria-label="Close dialog">&times;</button>
        </div>
        <div class="pwa-modal-body">
          ${instructionsHtml}
        </div>
        <div class="pwa-modal-footer">
          <button class="pwa-modal-btn pwa-modal-btn-primary" id="pwaModalOkBtn">Got it</button>
        </div>
      </div>
    `;

    document.body.appendChild(backdrop);

    // Event listeners to close
    const closeBtn = backdrop.querySelector("#pwaModalCloseBtn");
    const okBtn = backdrop.querySelector("#pwaModalOkBtn");

    if (closeBtn) closeBtn.addEventListener("click", closeModal);
    if (okBtn) okBtn.addEventListener("click", closeModal);

    backdrop.addEventListener("click", (e) => {
      if (e.target === backdrop) closeModal();
    });

    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && backdrop.classList.contains("active")) {
        closeModal();
      }
    });

    return backdrop;
  }

  function openModal() {
    const modal = ensureModalExists();
    requestAnimationFrame(() => {
      modal.classList.add("active");
    });
  }

  function closeModal() {
    const modal = document.getElementById("pwaInstallModalBackdrop");
    if (modal) {
      modal.classList.remove("active");
    }
  }

  // Expose global API
  window.NoxBuddyPWA = {
    promptInstall: handleInstallClick,
    openModal: openModal,
    closeModal: closeModal
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
