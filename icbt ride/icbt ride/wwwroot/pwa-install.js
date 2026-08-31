/**
 * ICBT Ride - Progressive Web App (PWA) Manager
 * Manages service worker registration, caching, and install prompts.
 */

(function () {
    // 1. Ensure Manifest and Meta Tags are present in <head>
    function ensurePwaMetaTags() {
        if (!document.querySelector('link[rel="manifest"]')) {
            const manifestLink = document.createElement('link');
            manifestLink.rel = 'manifest';
            manifestLink.href = '/manifest.webmanifest';
            document.head.appendChild(manifestLink);
        }

        if (!document.querySelector('meta[name="theme-color"]')) {
            const themeColor = document.createElement('meta');
            themeColor.name = 'theme-color';
            themeColor.content = '#1B5E20';
            document.head.appendChild(themeColor);
        }

        if (!document.querySelector('link[rel="apple-touch-icon"]')) {
            const appleIcon = document.createElement('link');
            appleIcon.rel = 'apple-touch-icon';
            appleIcon.href = '/icon-192.png';
            document.head.appendChild(appleIcon);
        }

        if (!document.querySelector('meta[name="apple-mobile-web-app-capable"]')) {
            const appleCapable = document.createElement('meta');
            appleCapable.name = 'apple-mobile-web-app-capable';
            appleCapable.content = 'yes';
            document.head.appendChild(appleCapable);
        }
    }

    ensurePwaMetaTags();

    // 2. Register Service Worker globally
    if ('serviceWorker' in navigator) {
        window.addEventListener('load', () => {
            navigator.serviceWorker.register('/service-worker.js', { scope: '/' })
                .then(reg => {
                    console.log('PWA Service Worker registered successfully with scope:', reg.scope);
                })
                .catch(err => {
                    console.warn('PWA Service Worker registration skipped or failed:', err);
                });
        });
    }

    // 3. Handle PWA Install Prompt Event
    window.deferredPwaPrompt = null;

    window.addEventListener('beforeinstallprompt', (e) => {
        // Prevent default mini-infobar on mobile
        e.preventDefault();
        window.deferredPwaPrompt = e;

        // Show any in-app install buttons
        document.querySelectorAll('.pwa-install-btn, #installAppBtn, #helpInstallBtn').forEach(btn => {
            btn.style.display = 'inline-flex';
        });

        // Trigger custom event so dashboards can update UI if needed
        window.dispatchEvent(new CustomEvent('pwaInstallAvailable'));
    });

    window.addEventListener('appinstalled', () => {
        window.deferredPwaPrompt = null;
        console.log('ICBT Ride App was installed successfully! 🎉');
        document.querySelectorAll('.pwa-install-btn, #installAppBtn').forEach(btn => {
            btn.style.display = 'none';
        });
    });

    // 4. Global Function to trigger PWA Installation
    window.triggerPwaInstall = async function () {
        if (window.deferredPwaPrompt) {
            window.deferredPwaPrompt.prompt();
            const { outcome } = await window.deferredPwaPrompt.userChoice;
            if (outcome === 'accepted') {
                console.log('User accepted the PWA install prompt');
            } else {
                console.log('User dismissed the PWA install prompt');
            }
            window.deferredPwaPrompt = null;
        } else {
            // Check if iOS Safari
            const isIos = /iphone|ipad|ipod/.test(window.navigator.userAgent.toLowerCase());
            if (isIos) {
                if (window.showAppAlert) {
                    window.showAppAlert({
                        title: "Install on iOS",
                        message: "Tap the Share button (square with arrow) at the bottom of Safari, then scroll down and tap 'Add to Home Screen'.",
                        type: "info"
                    });
                } else {
                    alert("To install on iOS: Tap the Share button at the bottom of Safari, then tap 'Add to Home Screen'.");
                }
            } else {
                if (window.showAppAlert) {
                    window.showAppAlert({
                        title: "Already Installed / Available",
                        message: "Click the Install App icon in your browser's address bar (top right) or browser menu to install ICBT Ride.",
                        type: "info"
                    });
                } else {
                    alert("Click the Install icon in your browser's address bar (top right) to install ICBT Ride.");
                }
            }
        }
    };

    // 5. Global Logout Handler & Link Interceptor
    window.performAppLogout = function () {
        try {
            localStorage.removeItem('loggedInUser');
            localStorage.removeItem('loggedInUser_passenger');
            localStorage.removeItem('loggedInUser_driver');
            localStorage.removeItem('loggedInUser_owner');
            localStorage.removeItem('loggedInUserId');
            localStorage.removeItem('loggedInUserRole');
            sessionStorage.clear();
        } catch (e) {
            console.warn('Logout cleanup warning:', e);
        }
        window.location.href = '/main-login/login.html?logout=true';
    };

    // Automatically intercept clicks on any Logout button or link across any dashboard
    document.addEventListener('click', (e) => {
        const link = e.target.closest('a, button');
        if (!link) return;
        const text = (link.textContent || '').trim().toLowerCase();
        const hasLogoutIcon = link.querySelector('.fa-right-from-bracket');
        const isLogoutId = link.id === 'logoutBtn' || link.classList.contains('mobile-logout-btn');

        if (isLogoutId || text === 'logout' || text.includes('log out') || hasLogoutIcon) {
            e.preventDefault();
            e.stopPropagation();
            window.performAppLogout();
        }
    }, true);
})();

