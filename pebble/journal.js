let journals = JSON.parse(localStorage.getItem("myJournals")) || [];
let currentJournal = null;

const newEntryBtn = document.getElementById("newEntryBtn");
const journalList = document.getElementById("journalList");
const titleInput = document.querySelector(".title-input");
const contentInput = document.querySelector(".journal-content");
const moodSelect = document.getElementById("moodSelect");
const saveBtn = document.getElementById("saveBtn");
const deleteBtn = document.getElementById("deleteBtn");

// Mobile Drawer Elements
const sidebar = document.getElementById("sidebar");
const sidebarBackdrop = document.getElementById("sidebarBackdrop");
const sidebarToggleBtn = document.getElementById("sidebarToggleBtn");
const sidebarCloseBtn = document.getElementById("sidebarCloseBtn");

function openSidebar() {
    if (sidebar) sidebar.classList.add("open");
    if (sidebarBackdrop) sidebarBackdrop.classList.add("open");
}

function closeSidebar() {
    if (sidebar) sidebar.classList.remove("open");
    if (sidebarBackdrop) sidebarBackdrop.classList.remove("open");
}

if (sidebarToggleBtn) sidebarToggleBtn.addEventListener("click", openSidebar);
if (sidebarCloseBtn) sidebarCloseBtn.addEventListener("click", closeSidebar);
if (sidebarBackdrop) sidebarBackdrop.addEventListener("click", closeSidebar);

/* ========================= Theme Management =========================== */
const moods = ['sad', 'happy', 'focused', 'tired'];

moodSelect.addEventListener('change', () => {
    moods.forEach(m => document.body.classList.remove('mood-' + m));
    document.body.classList.add('mood-' + moodSelect.value);
});

/* sad theme */
(function makeRain() {
    const c = document.getElementById('rainContainer');
    if (!c) return;
    for (let i = 0; i < 60; i++) {
        const d = document.createElement('div');
        d.className = 'raindrop';
        d.style.cssText = `
            left: ${Math.random() * 100}%;
            height: ${Math.random() * 60 + 40}px;
            animation-duration: ${Math.random() * 0.8 + 0.6}s;
            animation-delay: ${Math.random() * 3}s;
            opacity: ${Math.random() * 0.45 + 0.2};
        `;
        c.appendChild(d);
    }
})();

/* happy theme */
(function makeHappy() {
    const c = document.getElementById('happyContainer');
    if (!c) return;
    for (let i = 0; i < 10; i++) {
        const r = document.createElement('div');
        r.className = 'sun-ray';
        const angle = i * 36;
        const len = Math.random() * 120 + 100;
        r.style.cssText = `
            transform: rotate(${angle}deg);
            height: ${len}px;
            opacity: ${Math.random() * 0.4 + 0.2};
            animation-duration: ${Math.random() * 2 + 2}s;
            animation-delay: ${Math.random() * 2}s;
        `;
        c.appendChild(r);
    }
    for (let i = 0; i < 30; i++) {
        const p = document.createElement('div');
        p.className = 'pollen';
        const size  = Math.random() * 5 + 5;
        const drift = (Math.random() - 0.5) * 120;
        p.style.cssText = `
            left: ${Math.random() * 100}%;
            bottom: ${Math.random() * 20}%;
            width: ${size}px;
            height: ${size}px;
            --drift: ${drift}px;
            animation-duration: ${Math.random() * 8 + 6}s;
            animation-delay: ${Math.random() * 6}s;
            opacity: 0;
        `;
        c.appendChild(p);
    }
})();

/* focused theme */
(function makeFocused() {
    const c = document.getElementById('focusedContainer');
    if (!c) return;
    function spawnSpark() {
        if (!document.body.classList.contains('mood-focused')) {
            setTimeout(spawnSpark, 500);
            return;
        }
        const s = document.createElement('div');
        s.className = 'spark';
        const x     = Math.random() * window.innerWidth;
        const y     = Math.random() * window.innerHeight;
        const angle = Math.random() * Math.PI * 2;
        const dist  = Math.random() * 80 + 30;
        const dur   = Math.random() * 600 + 300;
        s.style.cssText = `
            left: ${x}px; top: ${y}px;
            --sx: ${Math.cos(angle) * dist}px;
            --sy: ${Math.sin(angle) * dist}px;
            animation-duration: ${dur}ms;
        `;
        c.appendChild(s);
        setTimeout(() => s.remove(), dur);
    }
    setInterval(spawnSpark, 200);
})();

/* tired theme */
(function makeTired() {
    const c = document.getElementById('tiredContainer');
    if (!c) return;
    for (let i = 0; i < 22; i++) {
        const f    = document.createElement('div');
        f.className = 'firefly';
        const size = Math.random() * 4 + 2;
        const dx   = (Math.random() - 0.5) * 160;
        const dy   = (Math.random() - 0.5) * 100;
        f.style.cssText = `
            left: ${Math.random() * 100}%;
            top: ${Math.random() * 100}%;
            width: ${size}px;
            height: ${size}px;
            --dx: ${dx}px;
            --dy: ${dy}px;
            animation-duration: ${Math.random() * 8 + 6}s;
            animation-delay: ${Math.random() * 8}s;
        `;
        c.appendChild(f);
    }
})();

/* =================================== Journal Management =========================== */

function saveToStorage() {
    try {
        localStorage.setItem("myJournals", JSON.stringify(journals));
    } catch (e) {
        console.warn("Storage quota exceeded or unavailable:", e);
        alert("Storage limit reached! Please remove large images or older entries.");
    }
}

function renderJournals() {
    journalList.innerHTML = "";
    journals.forEach(journal => {
        const card = document.createElement("div");
        card.classList.add("journal-card");
        if (currentJournal && journal.id === currentJournal.id) {
            card.classList.add("active");
        }
        card.innerHTML = `
            <h3>${journal.title || "Untitled"}</h3>
            <p>${journal.createdAt}</p>
        `;
        card.addEventListener("click", () => {
            loadJournal(journal);
            if (window.innerWidth <= 768) {
                closeSidebar();
            }
        });
        journalList.appendChild(card);
    });
}

function renderGallery(images = []) {
    const gal = document.getElementById("gallery");
    if (!gal) return;
    gal.innerHTML = "";
    images.forEach((imgSrc, imgIndex) => {
        const box = document.createElement("div");
        box.className = "image-box";
        box.innerHTML = `
            <img src="${imgSrc}" alt="Journal photo">
            <button class="image-delete-btn" type="button" title="Remove photo" aria-label="Remove photo">✕</button>
        `;
        box.querySelector(".image-delete-btn").addEventListener("click", (e) => {
            e.stopPropagation();
            if (currentJournal && Array.isArray(currentJournal.images)) {
                currentJournal.images.splice(imgIndex, 1);
                saveToStorage();
                renderGallery(currentJournal.images);
            }
        });
        gal.appendChild(box);
    });
}

function compressImage(file, maxWidth = 800, quality = 0.75) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
                let { width, height } = img;
                if (width > maxWidth) {
                    height = Math.round((height * maxWidth) / width);
                    width = maxWidth;
                }
                const canvas = document.createElement("canvas");
                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext("2d");
                ctx.drawImage(img, 0, 0, width, height);
                resolve(canvas.toDataURL("image/jpeg", quality));
            };
            img.onerror = reject;
            img.src = e.target.result;
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

function loadJournal(journal) {
    currentJournal       = journal;
    titleInput.value     = journal.title || "";
    contentInput.value   = journal.content || "";
    if (journal.mood) {
        moodSelect.value = journal.mood;
        moods.forEach(m => document.body.classList.remove('mood-' + m));
        document.body.classList.add('mood-' + journal.mood);
    }
    renderGallery(journal.images || []);
    renderJournals(); // re-render to update active card
}

function createJournal() {
    const currentMood = moodSelect.value;
    const journal = {
        id:        Date.now(),
        title:     "Untitled Journal",
        content:   "",
        mood:      currentMood,
        images:    [],
        createdAt: new Date().toLocaleDateString()
    };
    journals.unshift(journal);
    saveToStorage();
    loadJournal(journal);
    if (window.innerWidth <= 768) {
        closeSidebar();
    }
    contentInput.focus();
}

function saveJournal() {
    if (!currentJournal) {
        createJournal();
    }

    currentJournal.title   = titleInput.value.trim() || "Untitled Journal";
    currentJournal.content = contentInput.value;
    currentJournal.mood    = moodSelect.value;
    if (!Array.isArray(currentJournal.images)) {
        currentJournal.images = [];
    }

    const idx = journals.findIndex(j => j.id === currentJournal.id);
    if (idx === -1) {
        journals.unshift(currentJournal);
    } else {
        journals[idx] = currentJournal;
    }
    saveToStorage();
    renderJournals();
}

function deleteJournal() {
    if (!currentJournal) return;
    if (!confirm("Delete this journal?")) return;

    journals = journals.filter(j => j.id !== currentJournal.id);
    saveToStorage();
    currentJournal       = null;
    titleInput.value     = "";
    contentInput.value   = "";
    renderGallery([]);
    renderJournals();
    if (journals.length > 0) {
        loadJournal(journals[0]);
    }
}

newEntryBtn.addEventListener("click", createJournal);
saveBtn    .addEventListener("click", saveJournal);
deleteBtn  .addEventListener("click", deleteJournal);

// Load on start
renderJournals();
if (journals.length > 0) loadJournal(journals[0]);

/* ==================================== Image Upload =============================== */
const imageUploadInput = document.getElementById('imageUpload');
if (imageUploadInput) {
    imageUploadInput.addEventListener('change', async function () {
        if (!currentJournal) {
            createJournal();
        }
        if (!Array.isArray(currentJournal.images)) {
            currentJournal.images = [];
        }

        const files = Array.from(this.files);
        for (const file of files) {
            try {
                const compressed = await compressImage(file);
                currentJournal.images.push(compressed);
            } catch (err) {
                console.error("Failed to compress image:", err);
            }
        }
        this.value = ""; // reset so same file can be uploaded again if needed
        saveToStorage();
        renderGallery(currentJournal.images);
    });
}


/* ==========================================================================
   EXPORT JOURNAL AS CUSTOMIZABLE CLEAN WORD DOCUMENT PDF (NO WEBSITE UI)
   ========================================================================== */
const exportBtn             = document.getElementById("exportBtn");
const exportModal           = document.getElementById("exportModal");
const closeExportModal      = document.getElementById("closeExportModal");
const cancelExportBtn       = document.getElementById("cancelExportBtn");
const directDownloadPdfBtn  = document.getElementById("directDownloadPdfBtn");
const printPdfBtn           = document.getElementById("printPdfBtn");

const exportDocSheet        = document.getElementById("exportDocSheet");
const docPreviewTitle       = document.getElementById("docPreviewTitle");
const docPreviewDate        = document.getElementById("docPreviewDate");
const docPreviewMood        = document.getElementById("docPreviewMood");
const docPreviewContent     = document.getElementById("docPreviewContent");
const docPreviewGallery     = document.getElementById("docPreviewGallery");

// Style State Defaults
let docCustomization = {
    bgColor: "#FFFFFF",
    fontFamily: "'Playfair Display', Georgia, serif",
    fontColor: "#222222",
    fontSize: "16px"
};

function applyDocCustomization() {
    if (!exportDocSheet) return;
    exportDocSheet.style.backgroundColor = docCustomization.bgColor;
    exportDocSheet.style.fontFamily      = docCustomization.fontFamily;
    exportDocSheet.style.color           = docCustomization.fontColor;
    exportDocSheet.style.fontSize        = docCustomization.fontSize;
}

function syncPreviewContent() {
    const title = titleInput.value.trim() || (currentJournal && currentJournal.title) || "Untitled Journal";
    const content = contentInput.value.trim() || (currentJournal && currentJournal.content) || "(No written thoughts in this entry yet.)";
    const date = (currentJournal && currentJournal.createdAt) || new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
    const moodText = moodSelect ? moodSelect.options[moodSelect.selectedIndex].text : "Journal Entry";

    if (docPreviewTitle)   docPreviewTitle.textContent   = title;
    if (docPreviewDate)    docPreviewDate.textContent    = date;
    if (docPreviewMood)    docPreviewMood.textContent    = moodText;
    if (docPreviewContent) docPreviewContent.textContent = content;

    // Render images in document sheet preview
    if (docPreviewGallery) {
        docPreviewGallery.innerHTML = "";
        const imgs = (currentJournal && currentJournal.images) || [];
        imgs.forEach((src) => {
            const imgEl = document.createElement("img");
            imgEl.src = src;
            imgEl.alt = "Journal photo";
            docPreviewGallery.appendChild(imgEl);
        });
    }

    applyDocCustomization();
}

function openExportModal() {
    if (!currentJournal) {
        createJournal();
    }
    syncPreviewContent();
    if (exportModal) exportModal.classList.add("open");
}

function closeExport() {
    if (exportModal) exportModal.classList.remove("open");
}

if (exportBtn)        exportBtn.addEventListener("click", openExportModal);
if (closeExportModal) closeExportModal.addEventListener("click", closeExport);
if (cancelExportBtn)  cancelExportBtn.addEventListener("click", closeExport);
if (exportModal) {
    exportModal.addEventListener("click", (e) => {
        if (e.target === exportModal) closeExport();
    });
}

// Background Color Picker & Pills
const docBgOptions = document.getElementById("docBgOptions");
const docCustomBg  = document.getElementById("docCustomBg");
if (docBgOptions) {
    docBgOptions.querySelectorAll(".color-pill").forEach(btn => {
        btn.addEventListener("click", () => {
            docBgOptions.querySelectorAll(".color-pill").forEach(b => b.classList.remove("active"));
            btn.classList.add("active");
            docCustomization.bgColor = btn.dataset.color;
            applyDocCustomization();
        });
    });
}
if (docCustomBg) {
    docCustomBg.addEventListener("input", (e) => {
        if (docBgOptions) docBgOptions.querySelectorAll(".color-pill").forEach(b => b.classList.remove("active"));
        docCustomization.bgColor = e.target.value;
        applyDocCustomization();
    });
}

// Font Style Select
const docFontStyle = document.getElementById("docFontStyle");
if (docFontStyle) {
    docFontStyle.addEventListener("change", (e) => {
        docCustomization.fontFamily = e.target.value;
        applyDocCustomization();
    });
}

// Font Color Picker & Pills
const docFontColorOptions = document.getElementById("docFontColorOptions");
const docCustomColor       = document.getElementById("docCustomColor");
if (docFontColorOptions) {
    docFontColorOptions.querySelectorAll(".color-pill").forEach(btn => {
        btn.addEventListener("click", () => {
            docFontColorOptions.querySelectorAll(".color-pill").forEach(b => b.classList.remove("active"));
            btn.classList.add("active");
            docCustomization.fontColor = btn.dataset.color;
            applyDocCustomization();
        });
    });
}
if (docCustomColor) {
    docCustomColor.addEventListener("input", (e) => {
        if (docFontColorOptions) docFontColorOptions.querySelectorAll(".color-pill").forEach(b => b.classList.remove("active"));
        docCustomization.fontColor = e.target.value;
        applyDocCustomization();
    });
}

// Font Size Pills
const docFontSizeGroup = document.getElementById("docFontSizeGroup");
if (docFontSizeGroup) {
    docFontSizeGroup.querySelectorAll(".size-pill").forEach(btn => {
        btn.addEventListener("click", () => {
            docFontSizeGroup.querySelectorAll(".size-pill").forEach(b => b.classList.remove("active"));
            btn.classList.add("active");
            docCustomization.fontSize = btn.dataset.size;
            applyDocCustomization();
        });
    });
}

// DIRECT PDF DOWNLOAD VIA html2pdf
async function downloadDirectPdf() {
    if (!exportDocSheet) return;
    const cleanTitle = (docPreviewTitle.textContent || "Journal").replace(/[^a-zA-Z0-9_-]/g, "_");

    if (typeof html2pdf !== "undefined") {
        const originalText = directDownloadPdfBtn ? directDownloadPdfBtn.textContent : "";
        if (directDownloadPdfBtn) directDownloadPdfBtn.textContent = "⏳ Generating...";

        const opt = {
            margin:       [12, 12, 12, 12],
            filename:     `${cleanTitle}_Journal.pdf`,
            image:        { type: "jpeg", quality: 0.98 },
            html2canvas:  { scale: 2, useCORS: true, backgroundColor: docCustomization.bgColor },
            jsPDF:        { unit: "mm", format: "a4", orientation: "portrait" }
        };

        try {
            await html2pdf().set(opt).from(exportDocSheet).save();
        } catch (err) {
            console.warn("html2pdf failed, falling back to print-to-pdf:", err);
            printCleanDocument();
        } finally {
            if (directDownloadPdfBtn) directDownloadPdfBtn.textContent = originalText;
        }
    } else {
        printCleanDocument();
    }
}

// CLEAN PRINT / SAVE AS PDF (Pure document without website UI)
function printCleanDocument() {
    if (!exportDocSheet) return;
    const docHtml = exportDocSheet.innerHTML;
    const title   = docPreviewTitle.textContent || "Journal Document";

    const printWindow = window.open("", "_blank", "width=850,height=900");
    if (!printWindow) {
        alert("Please allow popups to open the print document preview.");
        return;
    }

    printWindow.document.write(`<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>${title}</title>
    <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,700;1,400&family=Nunito:wght@400;600;700&family=Space+Mono:wght@400;700&family=Lato:wght@400;700&display=swap" rel="stylesheet">
    <style>
        @page {
            size: A4 portrait;
            margin: 18mm 16mm;
        }
        * { box-sizing: border-box; }
        body {
            margin: 0;
            padding: 24px;
            background-color: ${docCustomization.bgColor};
            color: ${docCustomization.fontColor};
            font-family: ${docCustomization.fontFamily};
            font-size: ${docCustomization.fontSize};
            line-height: 1.85;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
        }
        .doc-sheet-title {
            font-size: 1.8em;
            font-weight: 700;
            margin-bottom: 8px;
            line-height: 1.25;
        }
        .doc-sheet-meta {
            font-size: 0.85em;
            opacity: 0.7;
            margin-bottom: 16px;
            display: flex;
            gap: 8px;
        }
        .doc-sheet-hr {
            border: none;
            height: 1px;
            background: currentColor;
            opacity: 0.25;
            margin-bottom: 24px;
        }
        .doc-sheet-body {
            white-space: pre-wrap;
            word-break: break-word;
        }
        .doc-sheet-gallery {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 16px;
            margin-top: 28px;
            page-break-inside: avoid;
        }
        .doc-sheet-gallery img {
            width: 100%;
            max-height: 220px;
            object-fit: cover;
            border-radius: 4px;
            border: 1px solid rgba(0,0,0,0.15);
        }
        .doc-sheet-footer {
            margin-top: 40px;
            padding-top: 14px;
            border-top: 1px dashed currentColor;
            opacity: 0.5;
            font-size: 0.75em;
            text-align: center;
        }
    </style>
</head>
<body>
    <div class="print-document-wrap">
        ${docHtml}
    </div>
    <script>
        window.onload = function() {
            window.focus();
            window.print();
            setTimeout(function() { window.close(); }, 500);
        };
    <\/script>
</body>
</html>`);
    printWindow.document.close();
}

if (directDownloadPdfBtn) directDownloadPdfBtn.addEventListener("click", downloadDirectPdf);
if (printPdfBtn)          printPdfBtn.addEventListener("click", printCleanDocument);
