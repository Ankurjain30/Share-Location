// --- Global Variables & Device Detection ---
let latitude = 0.0;
let longitude = 0.0;
let shareMessage = "";
let clickableText = "";
let lastFetchedLat = null;
let lastFetchedLon = null;

const addressText = document.getElementById("addressText");
const coordsText = document.getElementById("dialogtext");
const accuracyText = document.getElementById("accuracyText");
const progressBar = document.getElementById("progressBar");
const positiveBtn = document.getElementById("positive");

const isIOS = () => /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
const isChromeMobile = () => /Android.*Chrome/.test(navigator.userAgent);
const isStandalone = () => window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;

// --- Location Logic ---
function initLocation() {
    if (!navigator.geolocation) {
        addressText.innerText = "Geolocation is not supported by your browser";
        progressBar.style.display = "none";
        return;
    }

    navigator.geolocation.watchPosition(
        (position) => {
            updateLocationData(position);
        },
        (error) => {
            progressBar.style.display = "none";
            
            if (error.code === error.PERMISSION_DENIED || error.code === error.POSITION_UNAVAILABLE) {
                addressText.innerText = "Permission Denied";
                coordsText.innerText = "Tap the button below for instructions.";
                
                const errorModal = document.getElementById('errorModal');
                const errorInstructions = document.getElementById('errorInstructions');
                
                if (isIOS()) {
                    errorInstructions.innerHTML = `Your iPhone is blocking this browser from using GPS.<br><br>
                    <b>1.</b> Open your iPhone <b>Settings</b> app.<br>
                    <b>2.</b> Scroll down to <b>Chrome</b> (or Safari).<br>
                    <b>3.</b> Tap <b>Location</b> and select <span class="icon-badge">While Using the App</span>. Ensure <b>Precise Location</b> is ON.`;
                } else {
                    errorInstructions.innerHTML = `Your device is blocking location access.<br><br>
                    <b>1.</b> Tap the <b>Lock icon</b> in the address bar above.<br>
                    <b>2.</b> Tap <b>Permissions</b> or <b>Site Settings</b>.<br>
                    <b>3.</b> Set Location to <span class="icon-badge">Allow</span>.`;
                }
                
                errorModal.style.display = 'flex';
            } else if (error.code === error.TIMEOUT) {
                addressText.innerText = "Location Timeout";
                coordsText.innerText = "It took too long to get a GPS signal. Are you indoors?";
            }
        },
        {
            enableHighAccuracy: true,
            timeout: 15000,
            maximumAge: 0 // FORCE the browser to ignore cached locations and fetch fresh GPS
        }
    );
}

function updateLocationData(position) {
    latitude = position.coords.latitude;
    longitude = position.coords.longitude;
    const accuracy = Math.round(position.coords.accuracy);

    clickableText = `https://maps.google.com/?q=${latitude},${longitude}`;
    coordsText.innerText = `Lat: ${latitude.toFixed(5)} | Lon: ${longitude.toFixed(5)}`;
    
    accuracyText.style.display = "block";
    
    // Smart Accuracy Indicator: Warn the user if the GPS is still searching for a tight lock
    if (accuracy > 100) {
        accuracyText.style.color = "#FF9800"; // Orange warning color
        accuracyText.innerText = `Accuracy: ±${accuracy}m (Warming up GPS...)`;
    } else {
        accuracyText.style.color = "#4CAF50"; // Green success color
        accuracyText.innerText = `Accuracy: ±${accuracy} meters`;
    }

    progressBar.style.display = "none";
    positiveBtn.removeAttribute("disabled");
    positiveBtn.innerText = "Share";
    positiveBtn.onclick = triggerShare;

    // Fetch new address only if moved more than ~10 meters
    if (!lastFetchedLat || !lastFetchedLon || calculateDistance(lastFetchedLat, lastFetchedLon, latitude, longitude) > 0.01) {
        lastFetchedLat = latitude;
        lastFetchedLon = longitude;
        fetchAddress(latitude, longitude);
    }
}

function calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
}

function fetchAddress(lat, lon) {
    addressText.innerText = "Resolving street address...";
    
    fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}`, {
        headers: { 'Accept-Language': 'en' }
    })
        .then(response => response.json())
        .then(data => {
            if (data && data.display_name) {
                addressText.innerText = data.display_name;
                shareMessage = `It's easily share your location without saving the person's contact:\n${data.display_name}\n\nLive Location Link: ${clickableText}`;
            } else {
                addressText.innerText = "Unknown Address";
                shareMessage = `It's easily share your location without saving the person's contact: ${clickableText}`;
            }
        })
        .catch(() => {
            addressText.innerText = "Coordinates acquired";
            shareMessage = `It's easily share your location without saving the person's contact: ${clickableText}`;
        });
}

function triggerShare() {
    if (navigator.share) {
        navigator.share({
            title: 'Share My Location',
            text: shareMessage,
        }).catch((error) => console.log('Sharing canceled or failed', error));
    } else {
        navigator.clipboard.writeText(shareMessage).then(() => {
            alert("Location details copied to clipboard!");
        });
    }
}

// --- Smart Device-Aware Install Prompt Logic ---
let deferredPrompt = null;
const installModal = document.getElementById('installModal');
const installInstructions = document.getElementById('installInstructions');
const installActionBtn = document.getElementById('installActionBtn');
const modalTitleText = document.getElementById('modalTitleText');

function checkInstallPrompts() {
    if (isStandalone()) return;

    // 1. Android / Desktop Chrome (Event-driven automated prompt)
    window.addEventListener('beforeinstallprompt', (e) => {
        e.preventDefault();
        deferredPrompt = e;

        modalTitleText.innerText = "Install App";
        installInstructions.innerHTML = "Add <b>Share My Location</b> to your home screen for quick, app-like access without browser bars.";
        installActionBtn.innerText = "Install Now";
        installActionBtn.style.display = "block";
        installModal.style.display = 'flex';

        installActionBtn.onclick = async () => {
            if (!deferredPrompt) return;
            deferredPrompt.prompt();
            await deferredPrompt.userChoice;
            deferredPrompt = null;
            installModal.style.display = 'none';
        };
    });

    // 2. Dynamic Browser-Specific Instructions for iOS or Chrome Mobile Fallback
    setTimeout(() => {
        if (installModal.style.display === 'flex') return; // Already triggered via event

        const hasPrompted = sessionStorage.getItem('app_prompt_shown');
        if (hasPrompted) return;

        if (isIOS()) {
            // iOS Safari Instructions
            modalTitleText.innerText = "Add to Home Screen";
            installInstructions.innerHTML = `To install this app on your iPhone/iPad:<br><br>
                1. Tap the <span class="icon-badge">Share</span> icon at the bottom.<br>
                2. Scroll down and tap <span class="icon-badge">Add to Home Screen</span>.`;
            installActionBtn.innerText = "Got It";
            installActionBtn.onclick = () => {
                sessionStorage.setItem('app_prompt_shown', 'true');
                installModal.style.display = 'none';
            };
            installModal.style.display = 'flex';
        } else if (isChromeMobile()) {
            // Android Chrome Manual Fallback
            modalTitleText.innerText = "Add to Home Screen";
            installInstructions.innerHTML = `To install this app in Chrome:<br><br>
                1. Tap the menu icon (<span class="icon-badge">⋮</span>) at the top right.<br>
                2. Tap <span class="icon-badge">Add to Home screen</span> or <span class="icon-badge">Install app</span>.`;
            installActionBtn.innerText = "Got It";
            installActionBtn.onclick = () => {
                sessionStorage.setItem('app_prompt_shown', 'true');
                installModal.style.display = 'none';
            };
            installModal.style.display = 'flex';
        }
    }, 2000);
}

// --- Unified Initialization ---
window.addEventListener('load', () => {
    initLocation();
    checkInstallPrompts();

    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('./sw.js')
            .then((registration) => {
                console.log('ServiceWorker registration successful with scope: ', registration.scope);
            })
            .catch((error) => {
                console.log('ServiceWorker registration failed: ', error);
            });
    }
});