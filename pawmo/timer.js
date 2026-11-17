/* ============================================================
   PawMo — timer.js  (full dashboard edition)
   ============================================================ */

"use strict";

/* ── CONSTANTS ──────────────────────────────────────────────── */
const RING_CIRCUMFERENCE = 2 * Math.PI * 68; // 427.26
const XP_PER_SESSION     = 20;
const XP_PER_LEVEL       = 100;
const DAILY_GOAL_DEFAULT = 4;           // sessions
const ENERGY_SESSION_REWARD = 10;
const ENERGY_BREAK_PENALTY  = 5;
const ENERGY_RESET_PENALTY  = 8;

/* ── DOM ────────────────────────────────────────────────────── */
const $ = id => document.getElementById(id);
const startBtn      = $("startBtn");
const breakBtn      = $("breakBtn");
const resetBtn      = $("resetBtn");
const timerEl       = $("timer");
const timerSub      = $("timerSub");
const timerPct      = $("timerPct");
const selectionEl   = $("selection");
const ringFill      = $("ringFill");
const timeButtons   = document.querySelectorAll(".timeBtn");

const petFaceEl     = $("petFace");
const petnameEl     = $("petname");
const petSelectEl   = $("petSelect");
const petMsgEl      = $("petMessage");
const moodEl        = $("mood");
const energyEl      = $("energy");
const energyFillEl  = $("energyFill");
const streakEl      = $("streak");
const sessionsEl    = $("sessionsCount");
const distractEl    = $("distractCount");
const toastEl       = $("toast");
const themeBtn      = $("themeToggle");
const soundBtn      = $("soundToggle");
const soundIcon     = $("soundIcon");

/* ── AUDIO CHIME (WEB AUDIO API) ── */
let soundEnabled = localStorage.getItem("pawmoSound") !== "false";
let audioCtxInstance = null;

function getAudioContext() {
  if (!audioCtxInstance) {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (AudioCtx) audioCtxInstance = new AudioCtx();
  }
  if (audioCtxInstance && audioCtxInstance.state === "suspended") {
    audioCtxInstance.resume().catch(() => {});
  }
  return audioCtxInstance;
}

function updateSoundUI() {
  if (!soundBtn) return;
  soundBtn.classList.toggle("muted", !soundEnabled);
  soundBtn.title = soundEnabled ? "Focus chime: Sound ON" : "Focus chime: Muted";
  if (soundIcon) soundIcon.textContent = soundEnabled ? "🔔" : "🔕";
}
updateSoundUI();

if (soundBtn) {
  soundBtn.addEventListener("click", () => {
    soundEnabled = !soundEnabled;
    localStorage.setItem("pawmoSound", soundEnabled ? "true" : "false");
    updateSoundUI();
    if (soundEnabled) {
      getAudioContext();
      playFocusBellChime();
      showToast("Focus chime enabled 🔔", 2000);
    } else {
      showToast("Focus chime muted 🔕", 2000);
    }
  });
}

function playFocusBellChime() {
  if (!soundEnabled) return;
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    // Peaceful harmonic desk bell (D5: 587.33Hz -> A5: 880Hz with warm overtones)
    const bellTones = [
      { freq: 587.33, overtone: 1174.66, time: 0.0, dur: 2.8, gain: 0.28 },
      { freq: 880.00, overtone: 1760.00, time: 0.32, dur: 3.2, gain: 0.22 }
    ];

    bellTones.forEach(t => {
      const startTime = ctx.currentTime + t.time;

      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = "sine";
      osc1.frequency.setValueAtTime(t.freq, startTime);

      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = "sine";
      osc2.frequency.setValueAtTime(t.overtone, startTime);

      // Envelope: gentle attack (15ms), peaceful exponential decay
      gain1.gain.setValueAtTime(0.0001, startTime);
      gain1.gain.exponentialRampToValueAtTime(t.gain, startTime + 0.015);
      gain1.gain.exponentialRampToValueAtTime(0.0001, startTime + t.dur);

      gain2.gain.setValueAtTime(0.0001, startTime);
      gain2.gain.exponentialRampToValueAtTime(t.gain * 0.24, startTime + 0.015);
      gain2.gain.exponentialRampToValueAtTime(0.0001, startTime + t.dur * 0.7);

      osc1.connect(gain1);
      osc2.connect(gain2);
      gain1.connect(ctx.destination);
      gain2.connect(ctx.destination);

      osc1.start(startTime);
      osc2.start(startTime);
      osc1.stop(startTime + t.dur);
      osc2.stop(startTime + t.dur);
    });
  } catch (err) {
    console.warn("Could not play bell chime:", err);
  }
}

const xpLevelEl     = $("xpLevel");
const xpLabelEl     = $("xpLabel");
const xpBarFill     = $("xpBarFill");

const goalLabel     = $("goalLabel");
const goalBarFill   = $("goalBarFill");

const focusStrip    = $("focusStrip");
const focusScoreVal = $("focusScoreVal");

// modals
const progressModal  = $("progressModal");
const distractModal  = $("distractModal");
const sessionsRow    = $("sessionsRow");
const distractionRow = $("distractionRow");

/* ── STATE ──────────────────────────────────────────────────── */
let currentPetEmoji = "🐱";

let pet = {
  name: "Poco",
  mood: "Cheerful",
  energy: 80,
  streak: 0,
  level: 1,
  xp: 0,
  sessionsCompleted: 0,
  totalStudyTime: 0,   // seconds
  lastSessionDate: null,
};

let stats = {
  sessionsToday: 0,
  sessionsThisWeek: 0,
  totalSessions: 0,
  totalStudyTime: 0,   // seconds
  longestStreak: 0,
  dailyGoal: DAILY_GOAL_DEFAULT,
  xpToday: 0,
  lastResetDate: null,
};

let focusStats = {
  tabSwitchesToday: 0,
  distractionTimeToday: 0,  // seconds
  sessionFocusHistory: [],  // [{score, date}]
  bestFocusScore: null,
  worstFocusScore: null,
  averageFocusScore: null,
  completedSessions: 0,
  totalSessionsAttempted: 0,
};

// Timer
let timerInterval  = null;
let timeRemaining  = 0;
let totalTime      = 0;
let selectedTime   = 25;

// Distraction tracking (per session)
let sessionTabSwitches   = 0;
let sessionAwaySeconds   = 0;
let sessionAwayStart     = null;
let sessionActive        = false;   // true while timer is running

/* ── THEME ──────────────────────────────────────────────────── */
(function initTheme() {
  let saved = localStorage.getItem("theme");
  if (!saved) saved = window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  if (saved === "dark") document.body.classList.add("dark");
})();
themeBtn.addEventListener("click", () => {
  document.body.classList.toggle("dark");
  localStorage.setItem("theme", document.body.classList.contains("dark") ? "dark" : "light");
});

/* ── TOAST ──────────────────────────────────────────────────── */
let toastTimer = null;
function showToast(msg, duration = 3000) {
  toastEl.textContent = msg;
  toastEl.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toastEl.classList.remove("show"), duration);
}

/* ── PERSIST ────────────────────────────────────────────────── */
function save() {
  localStorage.setItem("pawmoPet",    JSON.stringify(pet));
  localStorage.setItem("pawmoStats",  JSON.stringify(stats));
  localStorage.setItem("pawmoFocus",  JSON.stringify(focusStats));
}

function load() {
  try { const r = localStorage.getItem("pawmoPet");   if (r) pet        = { ...pet,        ...JSON.parse(r) }; } catch(_){}
  try { const r = localStorage.getItem("pawmoStats"); if (r) stats      = { ...stats,      ...JSON.parse(r) }; } catch(_){}
  try { const r = localStorage.getItem("pawmoFocus"); if (r) focusStats = { ...focusStats, ...JSON.parse(r) }; } catch(_){}

  // Daily reset check
  const today = new Date().toDateString();
  if (stats.lastResetDate !== today) {
    stats.sessionsToday = 0;
    stats.xpToday = 0;
    focusStats.tabSwitchesToday = 0;
    focusStats.distractionTimeToday = 0;
    stats.lastResetDate = today;
    save();
  }

  // Streak continuity
  if (pet.lastSessionDate && pet.lastSessionDate !== today) {
    const yesterday = new Date(Date.now() - 86400000).toDateString();
    if (pet.lastSessionDate !== yesterday) {
      pet.streak = 0;
      save();
    }
  }

  // Week reset (simple: track by week number)
  const weekNum = getWeekNumber();
  if (!stats._weekNum || stats._weekNum !== weekNum) {
    stats.sessionsThisWeek = 0;
    stats._weekNum = weekNum;
    save();
  }
}

function getWeekNumber() {
  const d = new Date();
  d.setHours(0,0,0,0);
  d.setDate(d.getDate() + 3 - (d.getDay() + 6) % 7);
  const w = new Date(d.getFullYear(), 0, 4);
  return 1 + Math.round(((d - w) / 86400000 - 3 + (w.getDay() + 6) % 7) / 7);
}

/* ── PET IDENTITY ───────────────────────────────────────────── */
function loadPetIdentity() {
  const n = localStorage.getItem("petName");
  if (n) petnameEl.textContent = n;
  const e = localStorage.getItem("petEmoji");
  if (e) { currentPetEmoji = e; petSelectEl.value = e; }
}

petSelectEl.addEventListener("change", e => {
  currentPetEmoji = e.target.value;
  localStorage.setItem("petEmoji", currentPetEmoji);
  updatePetFace();
});

petnameEl.addEventListener("dblclick", () => {
  const input = document.createElement("input");
  input.classList.add("invalue");
  input.type = "text";
  input.value = petnameEl.textContent;
  input.maxLength = 18;
  petnameEl.parentNode.replaceChild(input, petnameEl);
  input.focus(); input.select();
  const commit = () => {
    const name = input.value.trim() || "Poco";
    petnameEl.textContent = name;
    localStorage.setItem("petName", name);
    if (input.parentNode) input.parentNode.replaceChild(petnameEl, input);
  };
  input.addEventListener("keydown", e => { if (e.key === "Enter") commit(); });
  input.addEventListener("blur", commit);
});

/* ── MOOD & MESSAGE ─────────────────────────────────────────── */
const MOODS = {
  Cheerful:  { emoji: "😊", messages: ["You're doing amazing! Keep it up! 🌟", "Great energy today!", "On a roll! 🎉"] },
  Focused:   { emoji: "😎", messages: ["Stay consistent — you've got this! 💪", "Steady and focused. Keep going!", "One session at a time. 🎯"] },
  Motivated: { emoji: "🚀", messages: ["Goal achieved! You're unstoppable! 🏆", "Smashed it! Time to celebrate 🎊", "Daily goal done — legendary! 🚀"] },
  Sleepy:    { emoji: "😴", messages: ["Need a little recharge? Let's go! ☕", "A short session can turn things around!", "Wake up, let's get productive! 🌅"] },
};

function determineMood() {
  const goalDone = stats.sessionsToday >= stats.dailyGoal;
  if (goalDone)           pet.mood = "Motivated";
  else if (pet.energy >= 80) pet.mood = "Cheerful";
  else if (pet.energy >= 50) pet.mood = "Focused";
  else                       pet.mood = "Sleepy";
}

function pickMessage() {
  const m = MOODS[pet.mood] || MOODS.Focused;
  const arr = m.messages;
  return arr[Math.floor(Math.random() * arr.length)];
}

function getMoodEmoji() {
  return (MOODS[pet.mood] || MOODS.Focused).emoji;
}

/* ── XP / LEVEL ─────────────────────────────────────────────── */
function addXP(amount) {
  pet.xp += amount;
  stats.xpToday += amount;
  let levelled = false;
  while (pet.xp >= XP_PER_LEVEL) {
    pet.xp -= XP_PER_LEVEL;
    pet.level++;
    levelled = true;
  }
  if (levelled) {
    showToast(`🏆 Level Up! ${petnameEl.textContent} is now Level ${pet.level}!`, 3500);
    xpLevelEl.classList.remove("levelup-animate");
    void xpLevelEl.offsetWidth; // reflow
    xpLevelEl.classList.add("levelup-animate");
    setTimeout(() => xpLevelEl.classList.remove("levelup-animate"), 700);
  }
  updateXpUI();
}

function updateXpUI() {
  xpLevelEl.textContent = `Lv ${pet.level}`;
  xpLabelEl.textContent = `${pet.xp} / ${XP_PER_LEVEL} XP`;
  const pct = (pet.xp / XP_PER_LEVEL) * 100;
  xpBarFill.style.width = pct + "%";
}

/* ── DAILY GOAL UI ──────────────────────────────────────────── */
function updateGoalUI() {
  const done  = Math.min(stats.sessionsToday, stats.dailyGoal);
  const total = stats.dailyGoal;
  const pct   = total > 0 ? (done / total) * 100 : 0;
  goalLabel.textContent = `${done} / ${total} Sessions`;
  goalBarFill.style.width = Math.min(pct, 100) + "%";
}

function checkGoal() {
  if (stats.sessionsToday === stats.dailyGoal) {
    // goal just hit
    goalBarFill.classList.remove("celebrate");
    void goalBarFill.offsetWidth;
    goalBarFill.classList.add("celebrate");
    setTimeout(() => goalBarFill.classList.remove("celebrate"), 1200);
    showToast("🎯 Daily Goal reached! Amazing work!", 3500);
    // bonus rewards
    pet.energy = Math.min(pet.energy + 5, 100);
    addXP(30); // bonus XP
  }
}

/* ── PET UI UPDATE ──────────────────────────────────────────── */
function updatePetFace() {
  if (petFaceEl) petFaceEl.textContent = currentPetEmoji;
}

function bumpValue(el) {
  if (!el) return;
  el.classList.remove("bump");
  void el.offsetWidth;
  el.classList.add("bump");
  setTimeout(() => el.classList.remove("bump"), 450);
}

function updatePetUI(animate = false) {
  determineMood();
  if (moodEl)      { moodEl.textContent   = `${getMoodEmoji()} ${pet.mood}`; if (animate) bumpValue(moodEl); }
  if (energyEl)    { energyEl.textContent = `⚡ ${pet.energy}%`;             if (animate) bumpValue(energyEl); }
  if (streakEl)    { streakEl.textContent = `🔥 ${pet.streak} Day${pet.streak !== 1 ? "s" : ""}`;  if (animate) bumpValue(streakEl); }
  if (sessionsEl)  sessionsEl.textContent  = stats.sessionsToday;
  if (distractEl)  distractEl.textContent  = focusStats.tabSwitchesToday;
  if (energyFillEl) energyFillEl.style.width = pet.energy + "%";
  updatePetFace();
  updateXpUI();
  updateGoalUI();
}

/* ── REWARD / PUNISH ────────────────────────────────────────── */
function rewardPet(xpAmount = XP_PER_SESSION) {
  pet.energy = Math.min(pet.energy + ENERGY_SESSION_REWARD, 100);
  pet.sessionsCompleted++;
  stats.sessionsToday++;
  stats.sessionsThisWeek++;
  stats.totalSessions++;

  const today = new Date().toDateString();
  if (pet.lastSessionDate !== today) {
    pet.streak++;
    pet.lastSessionDate = today;
    if (pet.streak > stats.longestStreak) stats.longestStreak = pet.streak;
  }

  determineMood();
  petMsgEl.textContent = pickMessage();
  updatePetUI(true);
  addXP(xpAmount);
  checkGoal();
  save();
}

function punishPet(energyLoss = ENERGY_BREAK_PENALTY) {
  pet.energy = Math.max(pet.energy - energyLoss, 0);
  determineMood();
  petMsgEl.textContent = pickMessage();
  updatePetUI(false);
  save();
}

/* ── FOCUS SCORE ────────────────────────────────────────────── */
function calcFocusScore(sessionSeconds, awaySeconds, switches, completed) {
  // Base: completion weight 50%, tab-switch weight 30%, away-time weight 20%
  const completionRatio = completed ? 1 : Math.max(0, (sessionSeconds - awaySeconds) / sessionSeconds);
  const switchPenalty   = Math.max(0, 1 - (switches * 0.05));
  const awayRatio       = Math.max(0, 1 - (awaySeconds / Math.max(sessionSeconds, 1)));
  const score = Math.round((completionRatio * 0.5 + switchPenalty * 0.3 + awayRatio * 0.2) * 100);
  return Math.min(100, Math.max(0, score));
}

function recordFocusSession(score) {
  focusStats.tabSwitchesToday += sessionTabSwitches;
  focusStats.distractionTimeToday += sessionAwaySeconds;
  focusStats.sessionFocusHistory.push({ score, date: new Date().toISOString() });
  if (focusStats.sessionFocusHistory.length > 30) focusStats.sessionFocusHistory.shift();

  // Update aggregates
  const scores = focusStats.sessionFocusHistory.map(s => s.score);
  focusStats.bestFocusScore  = Math.max(...scores);
  focusStats.worstFocusScore = Math.min(...scores);
  focusStats.averageFocusScore = Math.round(scores.reduce((a,b) => a+b, 0) / scores.length);

  // Show on strip
  focusStrip.classList.add("visible");
  focusScoreVal.textContent = score + "%";

  // Pet reaction
  if (score >= 90) {
    showToast(`🌟 Focus Score: ${score}% — Incredible focus! Bonus XP!`, 3500);
    addXP(10); // bonus
    pet.energy = Math.min(pet.energy + 3, 100);
    petMsgEl.textContent = "Wow! You stayed completely focused! 🌟";
  } else if (score >= 70) {
    showToast(`💪 Focus Score: ${score}% — Nice work!`, 2800);
    petMsgEl.textContent = "Nice work! Let's stay focused even longer next time 💪";
  } else {
    showToast(`🐾 Focus Score: ${score}% — Let's try again!`, 2800);
    punishPet(3);
    petMsgEl.textContent = "We got distracted a bit. Let's try again! 🐾";
  }

  if (distractEl) distractEl.textContent = focusStats.tabSwitchesToday;
  save();
}

/* ── DISTRACTION TRACKING (Page Visibility API) ─────────────── */
document.addEventListener("visibilitychange", () => {
  if (!sessionActive) return;
  if (document.hidden) {
    sessionTabSwitches++;
    sessionAwayStart = Date.now();
  } else {
    if (sessionAwayStart) {
      sessionAwaySeconds += Math.round((Date.now() - sessionAwayStart) / 1000);
      sessionAwayStart = null;
    }
  }
});
window.addEventListener("blur", () => {
  if (!sessionActive || sessionAwayStart) return;
  sessionTabSwitches++;
  sessionAwayStart = Date.now();
});
window.addEventListener("focus", () => {
  if (!sessionActive || !sessionAwayStart) return;
  sessionAwaySeconds += Math.round((Date.now() - sessionAwayStart) / 1000);
  sessionAwayStart = null;
});

function resetSessionDistraction() {
  sessionTabSwitches = 0;
  sessionAwaySeconds = 0;
  sessionAwayStart   = null;
}

/* ── TIMER RING & DISPLAY ───────────────────────────────────── */
function setRing(fraction) {
  ringFill.style.strokeDashoffset = RING_CIRCUMFERENCE * (1 - Math.max(0, Math.min(1, fraction)));
}

function formatTime(secs) {
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return m + ":" + (s < 10 ? "0" + s : s);
}

function formatDuration(secs) {
  if (secs < 60) return secs + "s";
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  if (m < 60) return m + "m " + (s > 0 ? s + "s" : "");
  const h = Math.floor(m / 60);
  return h + "h " + (m % 60) + "m";
}

function updateTimerDisplay() {
  timerEl.textContent = formatTime(timeRemaining);
  const fraction = totalTime > 0 ? timeRemaining / totalTime : 1;
  setRing(fraction);
  const pct = totalTime > 0 ? Math.round((1 - fraction) * 100) : 0;
  timerPct.textContent = pct + "% Complete";
}

function syncTimerToSelected() {
  timeRemaining = selectedTime * 60;
  totalTime     = timeRemaining;
  timerEl.textContent = formatTime(timeRemaining);
  timerSub.textContent = selectedTime + " min session";
  timerPct.textContent = "0% Complete";
  setRing(1);
}

/* ── TIME PRESETS ───────────────────────────────────────────── */
timeButtons.forEach(btn => {
  btn.addEventListener("click", () => {
    if (timerInterval !== null) return;
    selectedTime = Number(btn.dataset.time);
    timeButtons.forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    syncTimerToSelected();
    selectionEl.textContent = "Ready to focus";
    focusStrip.classList.remove("visible");
  });
});

/* ── TIMER CORE ─────────────────────────────────────────────── */
function startCountdown() {
  timerInterval = setInterval(() => {
    timeRemaining--;
    updateTimerDisplay();
    if (timeRemaining <= 0) {
      clearInterval(timerInterval);
      timerInterval = null;
      completeSession();
    }
  }, 1000);
}

function completeSession() {
  sessionActive = false;
  // finalise away time if tab is still hidden
  if (sessionAwayStart) {
    sessionAwaySeconds += Math.round((Date.now() - sessionAwayStart) / 1000);
    sessionAwayStart = null;
  }

  const sessionSecs = selectedTime * 60;
  stats.totalStudyTime += sessionSecs;
  pet.totalStudyTime   += sessionSecs;
  focusStats.completedSessions++;
  focusStats.totalSessionsAttempted++;

  const score = calcFocusScore(sessionSecs, sessionAwaySeconds, sessionTabSwitches, true);

  selectionEl.textContent = "Session Complete! 🎉";
  startBtn.disabled = false;
  breakBtn.textContent = "⏸ Break";

  playFocusBellChime();
  rewardPet(XP_PER_SESSION);
  recordFocusSession(score);
  resetSessionDistraction();
}

/* ── START ── */
startBtn.addEventListener("click", () => {
  getAudioContext();
  if (timerInterval !== null) return;
  totalTime     = selectedTime * 60;
  timeRemaining = totalTime;
  updateTimerDisplay();
  selectionEl.textContent = "Focusing…";
  petMsgEl.textContent    = "You've got this! I believe in you 💪";
  focusStrip.classList.remove("visible");
  resetSessionDistraction();
  sessionActive = true;
  focusStats.totalSessionsAttempted++;
  startCountdown();
  startBtn.disabled = true;
});

/* ── BREAK / RESUME ── */
breakBtn.addEventListener("click", () => {
  if (timerInterval !== null) {
    clearInterval(timerInterval);
    timerInterval = null;
    sessionActive = false;
    breakBtn.textContent = "▶ Resume";
    selectionEl.textContent = "On break…";
    petMsgEl.textContent = "Enjoy your break — but come back soon! 👀";
    punishPet(ENERGY_BREAK_PENALTY);
  } else if (timeRemaining > 0) {
    sessionActive = true;
    startCountdown();
    breakBtn.textContent = "⏸ Break";
    selectionEl.textContent = "Focusing…";
    petMsgEl.textContent = "Welcome back! Let's finish strong! 🔥";
  }
});

/* ── RESET ── */
resetBtn.addEventListener("click", () => {
  if (timerInterval !== null) {
    // abandoned session
    sessionActive = false;
    if (sessionAwayStart) {
      sessionAwaySeconds += Math.round((Date.now() - sessionAwayStart) / 1000);
      sessionAwayStart = null;
    }
    const elapsed = totalTime - timeRemaining;
    if (elapsed > 30) {
      focusStats.totalSessionsAttempted++;
      const score = calcFocusScore(totalTime, sessionAwaySeconds, sessionTabSwitches, false);
      recordFocusSession(score);
    }
    resetSessionDistraction();
    punishPet(ENERGY_RESET_PENALTY);
    showToast("Session abandoned. Try to finish next time! 💪");
  }
  clearInterval(timerInterval);
  timerInterval = null;
  syncTimerToSelected();
  selectionEl.textContent = "Ready to focus";
  petMsgEl.textContent    = "Let's study together!";
  breakBtn.textContent    = "⏸ Break";
  startBtn.disabled       = false;
});

/* ── MODALS ─────────────────────────────────────────────────── */
function openModal(el)  { el.classList.add("open");  }
function closeModal(el) { el.classList.remove("open"); }

// Open Progress modal
sessionsRow.addEventListener("click",   () => { fillProgressModal(); openModal(progressModal); });
sessionsRow.addEventListener("keydown", e => { if (e.key === "Enter" || e.key === " ") { fillProgressModal(); openModal(progressModal); } });

// Open Distraction modal
distractionRow.addEventListener("click",   () => { fillDistractModal(); openModal(distractModal); });
distractionRow.addEventListener("keydown", e => { if (e.key === "Enter" || e.key === " ") { fillDistractModal(); openModal(distractModal); } });

// Close buttons
$("closeProgressModal").addEventListener("click",  () => closeModal(progressModal));
$("closeDistractModal").addEventListener("click",  () => closeModal(distractModal));

// Click outside
progressModal.addEventListener("click", e => { if (e.target === progressModal) closeModal(progressModal); });
distractModal.addEventListener("click", e => { if (e.target === distractModal) closeModal(distractModal); });

// Escape key
document.addEventListener("keydown", e => {
  if (e.key === "Escape") { closeModal(progressModal); closeModal(distractModal); }
});

function fillProgressModal() {
  const goalPct = stats.dailyGoal > 0
    ? Math.min(100, Math.round((stats.sessionsToday / stats.dailyGoal) * 100))
    : 0;

  $("ms-sessions").textContent  = stats.sessionsToday;
  $("ms-time").textContent      = formatDuration(stats.totalStudyTime);
  $("ms-goal").textContent      = goalPct + "%";
  $("ms-xp").textContent        = stats.xpToday;
  $("ms-level").textContent     = pet.level;
  $("ms-total").textContent     = stats.totalSessions;
  $("ms-totaltime").textContent = formatDuration(stats.totalStudyTime);
  $("ms-beststreak").textContent = stats.longestStreak + " day" + (stats.longestStreak !== 1 ? "s" : "");

  $("modalInsight").textContent = generateInsight();
}

function fillDistractModal() {
  const awayFmt = formatDuration(focusStats.distractionTimeToday);
  const avgFocus = focusStats.averageFocusScore !== null ? focusStats.averageFocusScore + "%" : "—";
  const bestFocus = focusStats.bestFocusScore !== null ? focusStats.bestFocusScore + "%" : "—";
  const completionRate = focusStats.totalSessionsAttempted > 0
    ? Math.round((focusStats.completedSessions / focusStats.totalSessionsAttempted) * 100) + "%"
    : "0%";

  $("ds-switches").textContent    = focusStats.tabSwitchesToday;
  $("ds-away").textContent        = awayFmt;
  $("ds-focus").textContent       = focusStats.averageFocusScore !== null ? avgFocus : "—";
  $("ds-completion").textContent  = completionRate;
  $("ds-best").textContent        = bestFocus;
  $("ds-avg").textContent         = avgFocus;

  $("distractInsight").textContent = generateFocusInsight();
}

function generateInsight() {
  const s = stats.sessionsToday;
  const g = stats.dailyGoal;
  if (s === 0) return "No sessions yet today. Start your first session to begin tracking progress!";
  if (s >= g)  return `🎯 You've hit your daily goal of ${g} sessions. Incredible productivity today!`;
  const left = g - s;
  return `You've completed ${s} session${s !== 1 ? "s" : ""} today. ${left} more to reach your daily goal. You can do it!`;
}

function generateFocusInsight() {
  const history = focusStats.sessionFocusHistory;
  if (history.length === 0) return "No sessions tracked yet. Complete a session to see your focus insights!";
  if (history.length === 1) return `Your first session focus score: ${history[0].score}%. Keep going to see trends!`;

  const last  = history[history.length - 1].score;
  const prev  = history[history.length - 2].score;
  const diff  = last - prev;
  const trend = diff > 0
    ? `📈 Your focus improved by ${diff}% compared to your last session. Keep it up!`
    : diff < 0
    ? `📉 Focus dropped by ${Math.abs(diff)}% from your last session. Try minimising distractions.`
    : "➡ Consistent focus score. Great steadiness!";

  if (focusStats.tabSwitchesToday === 0) return "🏆 Zero tab switches today! Perfect focus.";
  return trend;
}

/* ── STREAK MILESTONES ──────────────────────────────────────── */
const STREAK_MILESTONES = [3, 7, 14, 30, 60, 100];
function checkStreakMilestone(streak) {
  if (STREAK_MILESTONES.includes(streak)) {
    showToast(`🔥 ${streak}-Day Streak! You're on fire!`, 4000);
    addXP(streak * 2);
  }
}

/* ── FULL SYNC ──────────────────────────────────────────────── */
function fullUpdate() {
  determineMood();
  updatePetUI(false);
  updatePetFace();
  syncTimerToSelected();
  petMsgEl.textContent = "Let's study together!";
}

/* ── INIT ───────────────────────────────────────────────────── */
window.addEventListener("load", () => {
  load();
  loadPetIdentity();
  fullUpdate();
});
