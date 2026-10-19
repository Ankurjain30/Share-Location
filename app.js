// --- Device-Aware Install Prompt Logic ---
let deferredPrompt = null;
const installModal = document.getElementById('installModal');
const installInstructions = document.getElementById('installInstructions');
const installActionBtn = document.getElementById('installActionBtn');
const modalCloseBtn = document.getElementById('modalCloseBtn');

const isIOS = () => /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
const isStandalone = () => window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;

modalCloseBtn.onclick = () => {
    installModal.style.display = 'none';
};

// 1. Android / Chromium Browsers (Event-driven prompt)
window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;

    if (isStandalone()) return;

    installInstructions.innerHTML = "Add <b>Share My Location</b> to your home screen for one-tap quick access without visiting the browser.";
    installActionBtn.innerText = "Install Now";
    installActionBtn.style.display = "block";
    installModal.style.display = 'flex';

    installActionBtn.onclick = async () => {
        if (!deferredPrompt) return;
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        deferredPrompt = null;
        installModal.style.display = 'none';
    };
});

// 2. iOS Safari (Manual instruction banner)
function checkIOSPrompt() {
    if (isIOS() && !isStandalone()) {
        const hasPrompted = sessionStorage.getItem('ios_prompt_shown');
        if (!hasPrompted) {
            installInstructions.innerHTML = `To install this app on your iPhone/iPad:<br><br>
                1. Tap the <span class="icon-badge">Share</span> button in Safari's menu bar below.<br>
                2. Scroll down and tap <span class="icon-badge">Add to Home Screen</span>.`;
            installActionBtn.innerText = "Got It";
            installActionBtn.onclick = () => {
                sessionStorage.setItem('ios_prompt_shown', 'true');
                installModal.style.display = 'none';
            };
            installModal.style.display = 'flex';
        }
    }
}

window.addEventListener('load', () => {
    checkIOSPrompt();
});