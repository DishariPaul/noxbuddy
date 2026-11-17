// Backend API URL: automatically points to localhost during dev or to deployed cloud URL in production
const PIXEL_API_URL = window.PIXEL_API_URL || (window.location.hostname === "127.0.0.1" || window.location.hostname === "localhost" ? "http://127.0.0.1:5000" : "https://noxbuddy.onrender.com");

let busy = false;
let chats = JSON.parse(localStorage.getItem("pixelChats")) || [];
let currentChat = null;

const THEMES = ['', 'theme-pastel', 'theme-mint', 'theme-sky', 'theme-sun', 'theme-night'];
const THEME_IDS = ['td-coral', 'td-pastel', 'td-mint', 'td-sky', 'td-sun', 'td-night'];

function setTheme(t) {
    document.body.className = t;
    localStorage.setItem('theme', t);
    THEMES.forEach((th, i) => {
        const dot = document.getElementById(THEME_IDS[i]);
        if (dot) dot.classList.toggle('selected', th === t);
    });
}

/* TEXTAREA AUTO RESIZING */
function autoResize(el) {
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 120) + 'px';
    const sendBtn = document.getElementById('sendBtn');
    if (sendBtn) sendBtn.disabled = !el.value.trim() || busy;
}

function handleKey(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
    }
}

/* ── Helpers ── */
function updateAppHeight() {
    const height = window.visualViewport ? window.visualViewport.height : window.innerHeight;
    document.documentElement.style.setProperty('--app-height', `${height}px`);
    const app = document.getElementById('app');
    if (app) {
        app.style.height = `${height}px`;
    }
}

window.addEventListener('resize', updateAppHeight);
window.addEventListener('orientationchange', () => setTimeout(updateAppHeight, 150));

if (window.visualViewport) {
    window.visualViewport.addEventListener('resize', () => {
        updateAppHeight();
        const wrap = document.getElementById('messages');
        if (wrap) wrap.scrollTop = wrap.scrollHeight;
    });
}

function getTime() {
    return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function escHtml(s) {
    return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function appendMsg(role, text) {
    const es = document.getElementById('emptyState');
    if (es) es.remove();

    const wrap = document.getElementById('messages');
    const div = document.createElement('div');
    div.className = 'msg ' + (role === 'user' ? 'me' : 'them');
    div.innerHTML = `
        <div class="bubble">${escHtml(text)}</div>
        <div class="msg-label">${getTime()}</div>
    `;
    wrap.appendChild(div);
    requestAnimationFrame(() => {
        wrap.scrollTop = wrap.scrollHeight;
    });
    return div;
}

function showTyping() {
    removeTyping();
    const wrap = document.getElementById('messages');
    const div = document.createElement('div');
    div.className = 'msg them typing';
    div.id = 'typing';
    div.innerHTML = `
        <div class="bubble">
            <span class="dot"></span>
            <span class="dot"></span>
            <span class="dot"></span>
        </div>
    `;
    wrap.appendChild(div);
    requestAnimationFrame(() => {
        wrap.scrollTop = wrap.scrollHeight;
    });
}

function removeTyping() {
    const t = document.getElementById('typing');
    if (t) t.remove();
}

function saveChats() {
    localStorage.setItem("pixelChats", JSON.stringify(chats));
}

/* ── Chat Logic ── */
async function sendMessage() {
    if (busy) return;

    if (!currentChat) {
        createNewChat();
    }

    const ta = document.getElementById('userInput');
    const text = ta.value.trim();
    if (!text) return;

    busy = true;
    document.getElementById('sendBtn').disabled = true;
    ta.value = "";
    ta.style.height = 'auto';

    /* Display user message */
    appendMsg('user', text);
    currentChat.messages.push({ role: "user", content: text });

    /* Generate title from first user message */
    if (currentChat.title === "New Chat") {
        currentChat.title = text.split(" ").slice(0, 4).join(" ");
        renderSidebar();
    }
    saveChats();
    showTyping();

    try {
        const res = await fetch(`${PIXEL_API_URL}/chat`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                message: text,
                history: currentChat.messages.slice(0, -1)
            })
        });

        if (!res.ok) {
            let errMsg = `Server returned status ${res.status}`;
            try {
                const errData = await res.json();
                if (errData.error) errMsg = errData.error;
            } catch (_) {}
            throw new Error(errMsg);
        }

        const data = await res.json();
        removeTyping();

        const reply = data.response || "I'm here for you! Could you try asking that again? 😊";
        currentChat.messages.push({ role: "assistant", content: reply });
        saveChats();
        appendMsg('assistant', reply);

    } catch (e) {
        removeTyping();
        console.error("Chat error:", e);
        let errorMsg = "hmm, something went sideways on my end 😬 wanna try again?";
        if (e.message.includes("Failed to fetch") || e.message.includes("NetworkError")) {
            errorMsg = "⚠️ Cannot reach the Pixel server. Please verify that the Python backend is running (`python pixel/app.py`).";
        }
        appendMsg('assistant', errorMsg);
    } finally {
        busy = false;
        const sendBtn = document.getElementById('sendBtn');
        if (sendBtn) sendBtn.disabled = !document.getElementById('userInput').value.trim();
    }
}

function sendChip(btn) {
    const text = btn.textContent.replace(/^[^\w]+/, '').trim();
    const input = document.getElementById('userInput');
    input.value = text;
    autoResize(input);
    sendMessage();
}

function toggleSidebar(force) {
    const sidebar = document.getElementById("sidebar");
    const backdrop = document.getElementById("sidebarBackdrop");
    if (!sidebar) return;
    const shouldOpen = typeof force === "boolean" ? force : !sidebar.classList.contains("open");
    sidebar.classList.toggle("open", shouldOpen);
    if (backdrop) backdrop.classList.toggle("open", shouldOpen);
}

/* ── Sidebar and Chat History ── */
function createNewChat() {
    // If current chat is already empty, just focus it instead of duplicating
    if (currentChat && currentChat.messages.length === 0) {
        loadChat(currentChat);
        toggleSidebar(false);
        return;
    }

    currentChat = {
        id: Date.now(),
        title: "New Chat",
        messages: []
    };
    chats.push(currentChat);
    saveChats();
    renderSidebar();
    showEmptyState();
    toggleSidebar(false);
}

function loadChat(chat) {
    currentChat = chat;
    const wrap = document.getElementById("messages");
    wrap.innerHTML = "";

    if (!chat.messages || chat.messages.length === 0) {
        showEmptyState();
        renderSidebar();
        toggleSidebar(false);
        return;
    }

    chat.messages.forEach(msg => appendMsg(msg.role, msg.content));
    renderSidebar();
    toggleSidebar(false);
}

function renderSidebar() {
    const sidebar = document.getElementById("recentChats");
    if (!sidebar) return;
    sidebar.innerHTML = "";

    [...chats].reverse().forEach(chat => {
        const item = document.createElement("div");
        item.className = "chat-item" + (chat.id === currentChat?.id ? " active" : "");
        item.textContent = chat.title;
        item.title = chat.title;

        const del = document.createElement("span");
        del.className = "chat-delete";
        del.textContent = "✕";
        del.title = "Delete Chat";
        del.onclick = (e) => {
            e.stopPropagation();
            deleteChat(chat.id);
        };

        item.appendChild(del);
        item.onclick = () => loadChat(chat);
        sidebar.appendChild(item);
    });
}

function deleteChat(id) {
    chats = chats.filter(c => c.id !== id);
    saveChats();

    if (currentChat?.id === id) {
        if (chats.length > 0) {
            loadChat(chats[chats.length - 1]);
        } else {
            createNewChat();
        }
    } else {
        renderSidebar();
    }
}

function showEmptyState() {
    const wrap = document.getElementById("messages");
    wrap.innerHTML = `
    <div class="empty" id="emptyState">
        <div class="empty-emoji">👋</div>
        <h2>hey there!</h2>
        <p>i'm pixel, your friendly AI pal. what's on your mind today?</p>
        <div class="chips">
            <button class="chip" onclick="sendChip(this)">✨ explain something</button>
            <button class="chip" onclick="sendChip(this)">💡 help me brainstorm</button>
            <button class="chip" onclick="sendChip(this)">📝 write something</button>
            <button class="chip" onclick="sendChip(this)">😂 tell me a joke</button>
        </div>
    </div>`;
}

/* Boot on page load */
window.addEventListener("DOMContentLoaded", () => {
    updateAppHeight();

    const savedTheme = localStorage.getItem('theme') || '';
    setTheme(savedTheme);

    const input = document.getElementById('userInput');
    if (input) {
        input.addEventListener('input', () => autoResize(input));
        input.addEventListener('focus', () => {
            setTimeout(() => {
                updateAppHeight();
                const wrap = document.getElementById('messages');
                if (wrap) wrap.scrollTop = wrap.scrollHeight;
            }, 300);
        });
    }

    if (chats.length === 0) {
        createNewChat();
    } else {
        currentChat = chats[chats.length - 1];
        loadChat(currentChat);
    }

    const menuToggle = document.getElementById('menuToggleBtn');
    const closeBtn = document.getElementById('sidebarCloseBtn');
    const backdrop = document.getElementById('sidebarBackdrop');

    if (menuToggle) menuToggle.addEventListener('click', () => toggleSidebar(true));
    if (closeBtn) closeBtn.addEventListener('click', () => toggleSidebar(false));
    if (backdrop) backdrop.addEventListener('click', () => toggleSidebar(false));
});
