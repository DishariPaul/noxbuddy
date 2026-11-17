const firebaseConfig = {
  apiKey: "AIzaSyB8LgjaKXhqZffGfNhJX3BYn-sxOb2r7V8",
  authDomain: "noxbuddy-23o11.firebaseapp.com",
  projectId: "noxbuddy-23o11",
  storageBucket: "noxbuddy-23o11.firebasestorage.app",
  messagingSenderId: "1088311396105",
  appId: "1:1088311396105:web:a33e96634f6fcd81a4f5d8",
  measurementId: "G-3GXT9CK2B0"
};

firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();

/* =============== STATE ============================= */
let currentMode    = 'login';   // 'login' | 'signup'
let currentMethod  = 'email';   // 'email' | 'phone'
let otpSent        = false;
let resendInterval = null;
let confirmationResult = null;  // Firebase phone confirmation

/* ================ MODE SWITCH ======================================= */
function switchMode(mode) {
    currentMode = mode;
    document.getElementById('loginModeBtn').classList.toggle('active', mode === 'login');
    document.getElementById('signupModeBtn').classList.toggle('active', mode === 'signup');
    document.getElementById('modeSlider').style.transform =
      mode === 'login' ? 'translateX(0)' : 'translateX(100%)';
    document.querySelectorAll('.signup-only').forEach(el =>
      el.classList.toggle('hidden', mode === 'login')
    );
    document.querySelectorAll('.login-only').forEach(el =>
      el.classList.toggle('hidden', mode === 'signup')
    );
    document.getElementById('emailSubmitBtn').querySelector('.btn-text').textContent =
      mode === 'login' ? 'Login' : 'Create Account';
    clearMessages();
}

/* ================== METHOD SWITCH ============================== */
function switchMethod(method) {
    currentMethod = method;
    document.getElementById('emailMethodBtn').classList.toggle('active', method === 'email');
    document.getElementById('phoneMethodBtn').classList.toggle('active', method === 'phone');
    document.getElementById('emailForm').classList.toggle('hidden', method === 'phone');
    document.getElementById('phoneForm').classList.toggle('hidden', method === 'email');
    clearMessages();
}

/* ==================== PASSWORD TOGGLE ====================================== */
function togglePassword(inputId, btn) {
    const input = document.getElementById(inputId);
    if (input.type === 'password') { input.type = 'text'; btn.textContent = '🙈'; }
    else                           { input.type = 'password'; btn.textContent = '👁️'; }
}

/* ==================== VALIDATION HELPERS ========================================= */
function showError(id, msg) {
    const el = document.getElementById(id);
    if (el) { el.textContent = msg; el.style.display = msg ? 'block' : 'none'; }
}
function clearMessages() {
    document.querySelectorAll('.field-error').forEach(e => { e.textContent = ''; e.style.display = 'none'; });
    document.querySelectorAll('.server-msg').forEach(e => { e.className = 'server-msg hidden'; e.textContent = ''; });
}
function showServerMsg(id, msg, isError) {
    const el = document.getElementById(id);
    el.textContent = msg;
    el.className = 'server-msg ' + (isError ? 'error' : 'success');
}
function validateEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

/* ================== EMAIL FORM SUBMIT — now uses Firebase directly ======= */
async function handleEmailSubmit(e) {
    e.preventDefault();
    clearMessages();

    const email    = document.getElementById('emailInput').value.trim();
    const password = document.getElementById('passwordInput').value;
    let valid = true;

    if (!validateEmail(email)) { showError('emailError', 'Enter a valid email.'); valid = false; }
    if (password.length < 6)   { showError('passwordError', 'Password must be at least 6 characters.'); valid = false; }

    if (currentMode === 'signup') {
        const name    = document.getElementById('nameInput').value.trim();
        const confirm = document.getElementById('confirmInput').value;
        if (!name)                { showError('nameError', 'Name is required.'); valid = false; }
        if (password !== confirm) { showError('confirmError', 'Passwords do not match.'); valid = false; }
        if (!valid) return;

        setLoading('emailSubmitBtn', 'emailLoader', true);
        try {
            // 1. Create the account
            const cred = await auth.createUserWithEmailAndPassword(email, password);
            // 2. Save the display name to the Firebase profile
            await cred.user.updateProfile({ displayName: name });
            showServerMsg('emailMsg', '🎉 Account created! Redirecting…', false);
            setTimeout(() => window.location.href = './home.html', 1500);
        } catch (err) {
            showServerMsg('emailMsg', friendlyFirebaseError(err), true);
        } finally {
            setLoading('emailSubmitBtn', 'emailLoader', false);
        }

    } else {
        // LOGIN
        if (!valid) return;
        setLoading('emailSubmitBtn', 'emailLoader', true);
        try {
            const cred = await auth.signInWithEmailAndPassword(email, password);
            showServerMsg('emailMsg', `👋 Welcome back, ${cred.user.displayName || email}! Redirecting…`, false);
            setTimeout(() => window.location.href = './home.html', 1200);
        } catch (err) {
            showServerMsg('emailMsg', friendlyFirebaseError(err), true);
        } finally {
            setLoading('emailSubmitBtn', 'emailLoader', false);
        }
    }
}

/* =============== PHONE / OTP FORM — now uses Firebase directly ========= */
async function handlePhoneSubmit(e) {
    e.preventDefault();
    clearMessages();

    const code  = document.getElementById('countryCode').value;
    const phone = document.getElementById('phoneInput').value.trim();
    const full  = code + phone;

    if (!phone || phone.length < 7) { showError('phoneError', 'Enter a valid phone number.'); return; }

    if (!otpSent) {
        // STEP 1 — Send OTP via Firebase
        setLoading('phoneSendBtn', 'phoneLoader', true);
        try {
            // recaptchaVerifier must exist on the page (see bottom of file)
            confirmationResult = await auth.signInWithPhoneNumber(full, window.recaptchaVerifier);
            otpSent = true;
            document.getElementById('otpGroup').classList.remove('hidden');
            document.getElementById('otpHint').textContent = `sent to ${full}`;
            document.getElementById('phoneBtnText').textContent = 'Verify OTP';
            document.getElementById('phoneInput').disabled = true;
            document.getElementById('countryCode').disabled = true;
            showServerMsg('phoneMsg', '📲 OTP sent! Check your phone.', false);
            startResendTimer(30);
            focusOTPBox(0);
        } catch (err) {
            showServerMsg('phoneMsg', friendlyFirebaseError(err), true);
            // Reset reCAPTCHA so it can be tried again
            window.recaptchaVerifier.render().then(id => grecaptcha.reset(id));
        } finally {
            setLoading('phoneSendBtn', 'phoneLoader', false);
        }

    } else {
        // STEP 2 — Verify OTP via Firebase
        const otp = getOTPValue();
        if (otp.length < 6) { showServerMsg('phoneMsg', 'Enter the full 6-digit OTP.', true); return; }

        setLoading('phoneSendBtn', 'phoneLoader', true);
        try {
            const cred = await confirmationResult.confirm(otp);

            // If signup, save a display name if the user typed one
            if (currentMode === 'signup') {
                const name = document.getElementById('phoneNameInput')?.value.trim();
                if (name) await cred.user.updateProfile({ displayName: name });
            }

            showServerMsg('phoneMsg', `✅ Verified! Redirecting…`, false);
            clearInterval(resendInterval);
            setTimeout(() => window.location.href = './home.html', 1200);
        } catch (err) {
            showServerMsg('phoneMsg', friendlyFirebaseError(err), true);
        } finally {
            setLoading('phoneSendBtn', 'phoneLoader', false);
        }
    }
}

/* ================ OTP BOX HELPERS ============================== */
function focusOTPBox(index) {
    const boxes = document.querySelectorAll('.otp-box');
    if (boxes[index]) boxes[index].focus();
}
function getOTPValue() {
    return Array.from(document.querySelectorAll('.otp-box'))
      .map(b => b.value).join('');
}

/* =================== RESEND OTP TIMER ===================================== */
function startResendTimer(seconds) {
    let s = seconds;
    const btn   = document.getElementById('resendBtn');
    const timer = document.getElementById('resendTimer');
    btn.disabled = true;
    resendInterval = setInterval(() => {
        s--;
        timer.textContent = `(${s}s)`;
        if (s <= 0) {
            clearInterval(resendInterval);
            btn.disabled = false;
            timer.textContent = '';
        }
    }, 1000);
}

async function resendOTP() {
    const code  = document.getElementById('countryCode').value;
    const phone = document.getElementById('phoneInput').value.trim();
    document.querySelectorAll('.otp-box').forEach(b => b.value = '');
    showServerMsg('phoneMsg', '📲 Resending OTP…', false);
    try {
        confirmationResult = await auth.signInWithPhoneNumber(
          code + phone, window.recaptchaVerifier
        );
        startResendTimer(30);
        focusOTPBox(0);
    } catch (err) {
        showServerMsg('phoneMsg', friendlyFirebaseError(err), true);
    }
}

/* =============== LOADING STATE ===================================== */
function setLoading(btnId, loaderId, on) {
    const btn    = document.getElementById(btnId);
    const loader = document.getElementById(loaderId);
    btn.disabled = on;
    loader.classList.toggle('hidden', !on);
    loader.classList.toggle('spin',    on);
}

/* =============== FRIENDLY FIREBASE ERROR MESSAGES ================== */
function friendlyFirebaseError(err) {
    const map = {
        'auth/email-already-in-use'    : '⚠ That email is already registered. Try logging in.',
        'auth/invalid-email'           : '⚠ Invalid email address.',
        'auth/weak-password'           : '⚠ Password is too weak (min 6 characters).',
        'auth/user-not-found'          : '⚠ No account found with that email.',
        'auth/wrong-password'          : '⚠ Incorrect password.',
        'auth/too-many-requests'       : '⚠ Too many attempts. Please wait a moment.',
        'auth/invalid-verification-code': '⚠ Incorrect OTP. Please try again.',
        'auth/code-expired'            : '⚠ OTP expired. Please resend.',
        'auth/invalid-phone-number'    : '⚠ Invalid phone number format.',
    };
    return map[err.code] || `⚠ ${err.message}`;
}

/* ========================== Google Authentication ====================== */
document.getElementById('googleBtn').addEventListener('click', async () => {
    try {
        const provider = new firebase.auth.GoogleAuthProvider();
        const result   = await auth.signInWithPopup(provider);
        showServerMsg('emailMsg', `👋 Welcome, ${result.user.displayName}! Redirecting…`, false);
        setTimeout(() => window.location.href = './home.html', 1200);
    } catch (err) {
        console.error(err);
        showServerMsg('emailMsg', friendlyFirebaseError(err), true);
    }
});


/* ================================ Forget Password ========================= */
document.getElementById("forgotPasswordLink").addEventListener("click", async (e) => {
    e.preventDefault();

    const email = document.getElementById("emailInput").value.trim();

    if (!email) {
        showServerMsg(
            "emailMsg",
            "Please enter your email address first.",
            true
        );
        return;
    }

    try {
        await auth.sendPasswordResetEmail(email);

        showServerMsg(
            "emailMsg",
            "📧 Password reset email sent! Check your inbox.",
            false
        );
    } catch (err) {
        showServerMsg(
            "emailMsg",
            friendlyFirebaseError(err),
            true
        );
    }
});


/* ========================== DOMContentLoaded =========================== */
document.addEventListener('DOMContentLoaded', () => {
    // ---- reCAPTCHA for phone auth (invisible, attached to the send button) ----
    // Make sure your HTML has a button/div with id="phoneSendBtn"
    window.recaptchaVerifier = new firebase.auth.RecaptchaVerifier('phoneSendBtn', {
        size: 'invisible',
        callback: () => { /* reCAPTCHA solved — form will continue */ }
    });

    // ---- OTP box auto-advance ----
    document.querySelectorAll('.otp-box').forEach((box, i, all) => {
        box.addEventListener('input', () => {
            box.value = box.value.replace(/\D/g, '');
            if (box.value && i < all.length - 1) all[i + 1].focus();
        });
        box.addEventListener('keydown', e => {
            if (e.key === 'Backspace' && !box.value && i > 0) all[i - 1].focus();
        });
    });

    // ---- Init mode display ----
    switchMode('login');
});

