/* ============================================================
   NOXBUDDY — home.js
   Study Desk Dashboard Controller
   Connects real Planr tasks, Pawmo timer, Pebble mood & Firebase
   ============================================================ */

"use strict";

/* ── FIREBASE AUTH SETUP ───────────────────────────────────── */
const firebaseConfig = {
  apiKey: "AIzaSyB8LgjaKXhqZffGfNhJX3BYn-sxOb2r7V8",
  authDomain: "noxbuddy-23o11.firebaseapp.com",
  projectId: "noxbuddy-23o11",
  storageBucket: "noxbuddy-23o11.firebasestorage.app",
  messagingSenderId: "1088311396105",
  appId: "1:1088311396105:web:a33e96634f6fcd81a4f5d8",
  measurementId: "G-3GXT9CK2B0"
};

if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}
const auth = firebase.auth();

/* ── DOM REFS ──────────────────────────────────────────────── */
const avatarEl         = document.getElementById("avatar");
const userNameEl       = document.getElementById("userName");
const logoutBtn        = document.getElementById("logoutBtn");
const greetingTitleEl  = document.getElementById("greetingTitle");
const taskContextLine  = document.getElementById("taskContextLine");
const mobileMenuBtn    = document.getElementById("mobileMenuBtn");
const mobileNavDrawer  = document.getElementById("mobileNavDrawer");

// Planr
const deskTaskList     = document.getElementById("deskTaskList");
const deskTaskTally    = document.getElementById("deskTaskTally");
const deskTodayDate    = document.getElementById("deskTodayDate");

// Pawmo
const deskStreakPill   = document.getElementById("deskStreakPill");
const deskPetFace      = document.getElementById("deskPetFace");
const deskPetMsg       = document.getElementById("deskPetMsg");
const deskTimerTime    = document.getElementById("deskTimerTime");
const deskTimerHint    = document.getElementById("deskTimerHint");
const deskRingProgress = document.getElementById("deskRingProgress");
const deskStartBtn     = document.getElementById("deskStartTimerBtn");
const deskResetBtn     = document.getElementById("deskResetTimerBtn");

// Metrics Strip
const metricStreak     = document.getElementById("metricStreak");
const metricTime       = document.getElementById("metricTime");
const metricTasks      = document.getElementById("metricTasks");

// Pebble
const deskPebbleCard   = document.getElementById("deskPebbleCard");
const deskMoodLabel    = document.getElementById("deskMoodLabel");
const deskJournalPreview = document.getElementById("deskJournalPreview");
const deskJournalDate  = document.getElementById("deskJournalDate");

/* ── AUTH STATE ────────────────────────────────────────────── */
auth.onAuthStateChanged((user) => {
  if (user) {
    const displayName = user.displayName || user.email?.split("@")[0] || "Friend";
    if (userNameEl) userNameEl.textContent = displayName;
    if (avatarEl) avatarEl.textContent = displayName.charAt(0).toUpperCase();
    localStorage.setItem("noxbuddy_user", JSON.stringify({
      uid: user.uid,
      name: displayName,
      email: user.email
    }));
  } else {
    localStorage.removeItem("noxbuddy_user");
  }
});

if (logoutBtn) {
  logoutBtn.addEventListener("click", async (e) => {
    e.preventDefault();
    try {
      await auth.signOut();
      window.location.replace("./auth.html");
    } catch (err) {
      console.error("Sign-out error:", err);
    }
  });
}

if (mobileMenuBtn && mobileNavDrawer) {
  mobileMenuBtn.addEventListener("click", () => {
    const isOpen = mobileNavDrawer.classList.toggle("open");
    mobileMenuBtn.setAttribute("aria-expanded", isOpen ? "true" : "false");
  });
}

/* ── GREETING & DATES ──────────────────────────────────────── */
function initGreeting() {
  const hour = new Date().getHours();
  let greeting = "Good evening.";
  if (hour < 12) {
    greeting = "Good morning.";
  } else if (hour < 17) {
    greeting = "Good afternoon.";
  }
  if (greetingTitleEl) greetingTitleEl.textContent = greeting;

  // Formatted date for Planr sheet (e.g. "September 30")
  const dateOptions = { month: "long", day: "numeric" };
  const todayStr = new Date().toLocaleDateString("en-US", dateOptions);
  if (deskTodayDate) deskTodayDate.textContent = todayStr;
}

/* ── PLANR INTEGRATION (REAL TASKS) ────────────────────────── */
let tasks = [];

function loadDeskTasks() {
  try {
    tasks = JSON.parse(localStorage.getItem("tasks")) || [];
  } catch (_) {
    tasks = [];
  }
  renderDeskTasks();
}

function saveDeskTasks() {
  localStorage.setItem("tasks", JSON.stringify(tasks));
  renderDeskTasks();
  updateProgressMetrics();
}

function renderDeskTasks() {
  if (!deskTaskList) return;
  deskTaskList.innerHTML = "";

  if (tasks.length === 0) {
    const emptyLi = document.createElement("li");
    emptyLi.className = "desk-task-item";
    emptyLi.style.color = "var(--text-muted)";
    emptyLi.style.fontStyle = "italic";
    emptyLi.textContent = "No tasks yet. Add one above to start.";
    deskTaskList.appendChild(emptyLi);
  } else {
    // Show up to 6 tasks cleanly
    tasks.slice(0, 6).forEach((task, index) => {
      const li = document.createElement("li");
      li.className = "desk-task-item" + (task.completed ? " completed" : "");

      const label = document.createElement("label");
      label.className = "task-label-wrap";

      const cb = document.createElement("input");
      cb.type = "checkbox";
      cb.className = "desk-checkbox";
      cb.checked = !!task.completed;
      cb.addEventListener("change", () => {
        task.completed = cb.checked;
        saveDeskTasks();
      });

      const span = document.createElement("span");
      span.className = "task-name";
      span.textContent = task.text;

      label.appendChild(cb);
      label.appendChild(span);

      const delBtn = document.createElement("button");
      delBtn.className = "task-delete-mini";
      delBtn.innerHTML = "&times;";
      delBtn.title = "Delete task";
      delBtn.addEventListener("click", () => {
        tasks.splice(index, 1);
        saveDeskTasks();
      });

      li.appendChild(label);
      li.appendChild(delBtn);
      deskTaskList.appendChild(li);
    });
  }

  // Tally & contextual header note
  const total = tasks.length;
  const remaining = tasks.filter(t => !t.completed).length;
  const completed = total - remaining;

  if (deskTaskTally) {
    deskTaskTally.textContent = `${remaining} task${remaining !== 1 ? "s" : ""} remaining`;
  }

  if (taskContextLine) {
    if (total === 0) {
      taskContextLine.textContent = "Your notebook is clear today.";
    } else if (remaining === 0) {
      taskContextLine.textContent = "All tasks completed for today!";
    } else {
      taskContextLine.textContent = `You have ${remaining} task${remaining !== 1 ? "s" : ""} left today.`;
    }
  }

  if (metricTasks) {
    metricTasks.textContent = `${completed}/${total}`;
  }
}

function handleDeskAddTask(e) {
  e.preventDefault();
  const input = document.getElementById("deskTaskInput");
  if (!input) return;
  const text = input.value.trim();
  if (!text) return;

  tasks.push({
    text: text,
    completed: false
  });
  input.value = "";
  saveDeskTasks();
}
window.handleDeskAddTask = handleDeskAddTask;

/* ── FOCUS BELL CHIME (WEB AUDIO API) ──────────────────────── */
let deskAudioCtx = null;
function playDeskBellChime() {
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    if (!deskAudioCtx) deskAudioCtx = new AudioCtx();
    if (deskAudioCtx.state === "suspended") deskAudioCtx.resume().catch(() => {});

    const tones = [
      { freq: 587.33, overtone: 1174.66, time: 0.0, dur: 2.8, gain: 0.28 },
      { freq: 880.00, overtone: 1760.00, time: 0.32, dur: 3.2, gain: 0.22 }
    ];

    tones.forEach(t => {
      const startTime = deskAudioCtx.currentTime + t.time;
      const osc1 = deskAudioCtx.createOscillator();
      const gain1 = deskAudioCtx.createGain();
      osc1.type = "sine";
      osc1.frequency.setValueAtTime(t.freq, startTime);

      const osc2 = deskAudioCtx.createOscillator();
      const gain2 = deskAudioCtx.createGain();
      osc2.type = "sine";
      osc2.frequency.setValueAtTime(t.overtone, startTime);

      gain1.gain.setValueAtTime(0.0001, startTime);
      gain1.gain.exponentialRampToValueAtTime(t.gain, startTime + 0.015);
      gain1.gain.exponentialRampToValueAtTime(0.0001, startTime + t.dur);

      gain2.gain.setValueAtTime(0.0001, startTime);
      gain2.gain.exponentialRampToValueAtTime(t.gain * 0.24, startTime + 0.015);
      gain2.gain.exponentialRampToValueAtTime(0.0001, startTime + t.dur * 0.7);

      osc1.connect(gain1);
      osc2.connect(gain2);
      gain1.connect(deskAudioCtx.destination);
      gain2.connect(deskAudioCtx.destination);

      osc1.start(startTime);
      osc2.start(startTime);
      osc1.stop(startTime + t.dur);
      osc2.stop(startTime + t.dur);
    });
  } catch (err) {
    console.warn("Desk chime could not play:", err);
  }
}

/* ── PAWMO INTEGRATION (REAL PET & TIMER) ──────────────────── */
const RING_CIRCUMFERENCE = 2 * Math.PI * 52; // 326.7
let deskTimerInterval = null;
let deskTimeRemaining = 25 * 60;
let deskTotalTime     = 25 * 60;
let deskTimerRunning  = false;

function loadPawmoData() {
  let pet = { name: "Poco", streak: 0, energy: 80 };
  let stats = { totalStudyTime: 0 };
  try {
    const petStr = localStorage.getItem("pawmoPet");
    if (petStr) pet = { ...pet, ...JSON.parse(petStr) };
    const statStr = localStorage.getItem("pawmoStats");
    if (statStr) stats = { ...stats, ...JSON.parse(statStr) };
  } catch (_) {}

  // Pet emoji from pet selector or default
  const savedEmoji = localStorage.getItem("petEmoji") || "🐱";
  if (deskPetFace) deskPetFace.textContent = savedEmoji;

  // Streak
  const streak = pet.streak || 0;
  if (deskStreakPill) deskStreakPill.innerHTML = `&#x1F525; ${streak} day streak`;
  if (metricStreak) metricStreak.textContent = streak;

  // Total Study minutes
  const totalMin = Math.round((stats.totalStudyTime || 0) / 60);
  if (metricTime) metricTime.textContent = totalMin;
}

function updateDeskTimerDisplay() {
  const m = Math.floor(deskTimeRemaining / 60);
  const s = deskTimeRemaining % 60;
  const timeStr = `${m}:${s < 10 ? "0" + s : s}`;
  if (deskTimerTime) deskTimerTime.textContent = timeStr;

  if (deskRingProgress) {
    const fraction = deskTimeRemaining / deskTotalTime;
    const offset = RING_CIRCUMFERENCE * (1 - fraction);
    deskRingProgress.style.strokeDashoffset = offset;
  }
}

function startDeskTimer() {
  if (deskTimerRunning) {
    // Pause
    clearInterval(deskTimerInterval);
    deskTimerRunning = false;
    if (deskStartBtn) deskStartBtn.textContent = "Resume Focus \u2192";
    if (deskTimerHint) deskTimerHint.textContent = "Paused";
    if (deskPetMsg) deskPetMsg.textContent = "Catching our breath...";
  } else {
    // Start / Resume
    deskTimerRunning = true;
    if (deskStartBtn) deskStartBtn.textContent = "Pause Focus";
    if (deskTimerHint) deskTimerHint.textContent = "Focusing...";
    if (deskPetMsg) deskPetMsg.textContent = "You've got this! Steady focus \uD83C\uDF1F";

    deskTimerInterval = setInterval(() => {
      deskTimeRemaining--;
      updateDeskTimerDisplay();
      if (deskTimeRemaining <= 0) {
        clearInterval(deskTimerInterval);
        deskTimerRunning = false;
        deskTimeRemaining = deskTotalTime;
        updateDeskTimerDisplay();
        if (deskStartBtn) deskStartBtn.textContent = "Start Focus \u2192";
        if (deskTimerHint) deskTimerHint.textContent = "Session complete! \uD83C\uDF89";
        if (deskPetMsg) deskPetMsg.textContent = "Amazing job! Take a well-earned break.";
      }
    }, 1000);
  }
}

function resetDeskTimer() {
  clearInterval(deskTimerInterval);
  deskTimerRunning = false;
  deskTimeRemaining = deskTotalTime;
  updateDeskTimerDisplay();
  if (deskStartBtn) deskStartBtn.textContent = "Start Focus \u2192";
  if (deskTimerHint) deskTimerHint.textContent = "Ready to focus";
  if (deskPetMsg) deskPetMsg.textContent = "Let's study together!";
}

if (deskStartBtn) deskStartBtn.addEventListener("click", startDeskTimer);
if (deskResetBtn) deskResetBtn.addEventListener("click", resetDeskTimer);

/* ── PEBBLE INTEGRATION (MOOD & JOURNAL) ───────────────────── */
const MOOD_TITLES = {
  calm: "Peaceful & centered",
  happy: "Feeling light & accomplished",
  focused: "Deep in the zone",
  sad: "A little heavy, but continuing",
  tired: "Ready to wrap up and rest"
};

function selectDeskMood(mood) {
  document.querySelectorAll(".mood-btn").forEach(btn => {
    btn.classList.toggle("active", btn.dataset.mood === mood);
  });

  if (deskPebbleCard) {
    deskPebbleCard.setAttribute("data-mood", mood);
  }

  if (deskMoodLabel) {
    deskMoodLabel.textContent = MOOD_TITLES[mood] || "How are you feeling today?";
  }
  localStorage.setItem("todayDeskMood", mood);
}
window.selectDeskMood = selectDeskMood;

function loadPebbleData() {
  try {
    const savedMood = localStorage.getItem("todayDeskMood") || "happy";
    selectDeskMood(savedMood);

    const journals = JSON.parse(localStorage.getItem("myJournals")) || [];
    if (journals.length > 0) {
      const latest = journals[0];
      if (deskJournalPreview) {
        const text = latest.content?.trim() || latest.title || "Wrote an entry today.";
        deskJournalPreview.textContent = `\u201C${text.slice(0, 110)}${text.length > 110 ? "\u2026" : ""}\u201D`;
      }
      if (deskJournalDate) {
        deskJournalDate.textContent = latest.createdAt ? `Entry from ${latest.createdAt}` : "Recent entry";
      }
    }
  } catch (_) {}
}

/* ── OVERALL PROGRESS METRICS ──────────────────────────────── */
function updateProgressMetrics() {
  const total = tasks.length;
  const completed = tasks.filter(t => t.completed).length;
  if (metricTasks) metricTasks.textContent = `${completed}/${total}`;
}

/* ── INITIALIZATION ────────────────────────────────────────── */
window.addEventListener("DOMContentLoaded", () => {
  initGreeting();
  loadDeskTasks();
  loadPawmoData();
  loadPebbleData();
  updateProgressMetrics();
  updateDeskTimerDisplay();
});
