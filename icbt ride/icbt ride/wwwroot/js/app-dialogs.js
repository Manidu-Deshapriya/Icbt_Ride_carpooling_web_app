/**
 * ICBT Ride - Universal In-App Dialog & Confirmation System
 * Replaces ugly native browser alert() and confirm() dialogs with modern, premium in-app modals.
 */

(function () {
    'use strict';

    // Inject Dialog CSS
    const style = document.createElement('style');
    style.id = 'icbt-app-dialog-styles';
    style.innerHTML = `
        .app-dialog-backdrop {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(15, 23, 42, 0.65);
            backdrop-filter: blur(6px);
            -webkit-backdrop-filter: blur(6px);
            z-index: 999999;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 16px;
            opacity: 0;
            visibility: hidden;
            transition: opacity 0.2s ease, visibility 0.2s ease;
        }
        .app-dialog-backdrop.active {
            opacity: 1;
            visibility: visible;
        }
        .app-dialog-card {
            background: #ffffff;
            width: 100%;
            max-width: 440px;
            border-radius: 24px;
            box-shadow: 0 25px 60px -15px rgba(0, 0, 0, 0.3), 0 0 0 1px rgba(0, 0, 0, 0.05);
            padding: 28px 24px;
            text-align: center;
            transform: scale(0.92) translateY(10px);
            transition: transform 0.25s cubic-bezier(0.16, 1, 0.3, 1);
            position: relative;
            overflow: hidden;
        }
        .app-dialog-backdrop.active .app-dialog-card {
            transform: scale(1) translateY(0);
        }
        .app-dialog-icon-wrapper {
            width: 64px;
            height: 64px;
            border-radius: 50%;
            margin: 0 auto 16px auto;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 1.8rem;
        }
        .app-dialog-icon-danger {
            background: rgba(239, 68, 68, 0.12);
            color: #ef4444;
        }
        .app-dialog-icon-warning {
            background: rgba(245, 158, 11, 0.12);
            color: #f59e0b;
        }
        .app-dialog-icon-success {
            background: rgba(16, 185, 129, 0.12);
            color: #10b981;
        }
        .app-dialog-icon-info {
            background: rgba(27, 94, 32, 0.12);
            color: #1B5E20;
        }
        .app-dialog-title {
            font-size: 1.25rem;
            font-weight: 700;
            color: #0f172a;
            margin: 0 0 8px 0;
            line-height: 1.3;
        }
        .app-dialog-message {
            font-size: 0.92rem;
            color: #475569;
            line-height: 1.55;
            margin: 0 0 24px 0;
            white-space: pre-line;
        }
        .app-dialog-actions {
            display: flex;
            gap: 12px;
            justify-content: center;
        }
        .app-dialog-btn {
            flex: 1;
            padding: 12px 18px;
            border-radius: 12px;
            font-size: 0.92rem;
            font-weight: 600;
            cursor: pointer;
            border: none;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            gap: 6px;
            transition: all 0.15s ease;
        }
        .app-dialog-btn:hover {
            transform: translateY(-1px);
        }
        .app-dialog-btn-cancel {
            background: #f1f5f9;
            color: #475569;
            border: 1px solid #e2e8f0;
        }
        .app-dialog-btn-cancel:hover {
            background: #e2e8f0;
            color: #1e293b;
        }
        .app-dialog-btn-confirm-danger {
            background: #ef4444;
            color: #ffffff;
            box-shadow: 0 4px 14px rgba(239, 68, 68, 0.35);
        }
        .app-dialog-btn-confirm-danger:hover {
            background: #dc2626;
        }
        .app-dialog-btn-confirm-primary {
            background: #1B5E20;
            color: #ffffff;
            box-shadow: 0 4px 14px rgba(27, 94, 32, 0.35);
        }
        .app-dialog-btn-confirm-primary:hover {
            background: #144617;
        }

        /* Modern Toast Notifications */
        .app-toast-container {
            position: fixed;
            bottom: 24px;
            right: 24px;
            z-index: 9999999;
            display: flex;
            flex-direction: column;
            gap: 10px;
            pointer-events: none;
        }
        .app-toast {
            pointer-events: auto;
            background: #ffffff;
            color: #1e293b;
            padding: 14px 20px;
            border-radius: 14px;
            box-shadow: 0 10px 30px rgba(0,0,0,0.18), 0 0 0 1px rgba(0,0,0,0.06);
            display: flex;
            align-items: center;
            gap: 12px;
            font-size: 0.9rem;
            font-weight: 600;
            min-width: 280px;
            max-width: 420px;
            transform: translateY(20px);
            opacity: 0;
            animation: toastIn 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        @keyframes toastIn {
            to { transform: translateY(0); opacity: 1; }
        }
    `;
    document.head.appendChild(style);

    // Create Root Dialog Backdrop
    let backdropEl = null;
    let toastContainerEl = null;

    function ensureBackdrop() {
        if (!backdropEl) {
            backdropEl = document.createElement('div');
            backdropEl.className = 'app-dialog-backdrop';
            backdropEl.innerHTML = `
                <div class="app-dialog-card">
                    <div id="appDialogIcon" class="app-dialog-icon-wrapper app-dialog-icon-warning">
                        <i class="fa-solid fa-triangle-exclamation"></i>
                    </div>
                    <h3 id="appDialogTitle" class="app-dialog-title">Confirm Action</h3>
                    <p id="appDialogMessage" class="app-dialog-message">Are you sure you want to proceed?</p>
                    <div id="appDialogActions" class="app-dialog-actions">
                        <button id="appDialogCancelBtn" class="app-dialog-btn app-dialog-btn-cancel">Cancel</button>
                        <button id="appDialogConfirmBtn" class="app-dialog-btn app-dialog-btn-confirm-danger">Yes, Proceed</button>
                    </div>
                </div>
            `;
            document.body.appendChild(backdropEl);
        }
        return backdropEl;
    }

    function ensureToastContainer() {
        if (!toastContainerEl) {
            toastContainerEl = document.createElement('div');
            toastContainerEl.className = 'app-toast-container';
            document.body.appendChild(toastContainerEl);
        }
        return toastContainerEl;
    }

    /**
     * Show Modern In-App Confirmation Modal (Promise-based)
     */
    function showAppConfirm(options) {
        return new Promise((resolve) => {
            const opts = typeof options === 'string' ? { message: options } : (options || {});
            const backdrop = ensureBackdrop();

            const iconEl = document.getElementById('appDialogIcon');
            const titleEl = document.getElementById('appDialogTitle');
            const msgEl = document.getElementById('appDialogMessage');
            const cancelBtn = document.getElementById('appDialogCancelBtn');
            const confirmBtn = document.getElementById('appDialogConfirmBtn');

            // Set Title & Message
            titleEl.textContent = opts.title || 'Please Confirm';
            msgEl.textContent = opts.message || 'Are you sure you want to perform this action?';

            // Configure Icon & Color
            const msgLower = (opts.message || '').toLowerCase();
            const isDanger = opts.type === 'danger' || opts.isDanger !== false || msgLower.includes('cancel') || msgLower.includes('delete') || msgLower.includes('reject') || msgLower.includes('remove');
            
            if (isDanger) {
                iconEl.className = 'app-dialog-icon-wrapper app-dialog-icon-danger';
                iconEl.innerHTML = '<i class="fa-solid fa-triangle-exclamation"></i>';
                confirmBtn.className = 'app-dialog-btn app-dialog-btn-confirm-danger';
            } else {
                iconEl.className = 'app-dialog-icon-wrapper app-dialog-icon-info';
                iconEl.innerHTML = '<i class="fa-solid fa-circle-question"></i>';
                confirmBtn.className = 'app-dialog-btn app-dialog-btn-confirm-primary';
            }

            cancelBtn.textContent = opts.cancelText || 'No, Keep It';
            confirmBtn.textContent = opts.confirmText || (isDanger ? 'Yes, Proceed' : 'Yes, Confirm');
            cancelBtn.style.display = 'block';

            function cleanup(result) {
                backdrop.classList.remove('active');
                cancelBtn.onclick = null;
                confirmBtn.onclick = null;
                setTimeout(() => {
                    resolve(result);
                }, 200);
            }

            cancelBtn.onclick = () => cleanup(false);
            confirmBtn.onclick = () => cleanup(true);

            backdrop.classList.add('active');
        });
    }

    /**
     * Show Modern In-App Alert Modal (Promise-based)
     */
    function showAppAlert(options) {
        return new Promise((resolve) => {
            const opts = typeof options === 'string' ? { message: options } : (options || {});
            const backdrop = ensureBackdrop();

            const iconEl = document.getElementById('appDialogIcon');
            const titleEl = document.getElementById('appDialogTitle');
            const msgEl = document.getElementById('appDialogMessage');
            const cancelBtn = document.getElementById('appDialogCancelBtn');
            const confirmBtn = document.getElementById('appDialogConfirmBtn');

            titleEl.textContent = opts.title || 'Notification';
            msgEl.textContent = opts.message || '';

            const msgLower = (opts.message || '').toLowerCase();
            const isSuccess = opts.type === 'success' || msgLower.includes('success') || msgLower.includes('confirmed') || msgLower.includes('booked') || msgLower.includes('refunded');
            const isError = opts.type === 'error' || msgLower.includes('error') || msgLower.includes('failed') || msgLower.includes('insufficient');

            if (isSuccess) {
                iconEl.className = 'app-dialog-icon-wrapper app-dialog-icon-success';
                iconEl.innerHTML = '<i class="fa-solid fa-circle-check"></i>';
                confirmBtn.className = 'app-dialog-btn app-dialog-btn-confirm-primary';
            } else if (isError) {
                iconEl.className = 'app-dialog-icon-wrapper app-dialog-icon-danger';
                iconEl.innerHTML = '<i class="fa-solid fa-circle-xmark"></i>';
                confirmBtn.className = 'app-dialog-btn app-dialog-btn-confirm-danger';
            } else {
                iconEl.className = 'app-dialog-icon-wrapper app-dialog-icon-info';
                iconEl.innerHTML = '<i class="fa-solid fa-circle-info"></i>';
                confirmBtn.className = 'app-dialog-btn app-dialog-btn-confirm-primary';
            }

            cancelBtn.style.display = 'none';
            confirmBtn.textContent = opts.btnText || 'OK';

            confirmBtn.onclick = () => {
                backdrop.classList.remove('active');
                confirmBtn.onclick = null;
                setTimeout(() => resolve(true), 200);
            };

            backdrop.classList.add('active');
        });
    }

    /**
     * Show Floating Toast
     */
    function showAppToast(message, type = 'success') {
        const container = ensureToastContainer();
        const toast = document.createElement('div');
        toast.className = 'app-toast';

        let icon = '<i class="fa-solid fa-circle-check" style="color: #10b981; font-size: 1.2rem;"></i>';
        if (type === 'error' || type === 'danger') {
            icon = '<i class="fa-solid fa-circle-exclamation" style="color: #ef4444; font-size: 1.2rem;"></i>';
        } else if (type === 'warning') {
            icon = '<i class="fa-solid fa-triangle-exclamation" style="color: #f59e0b; font-size: 1.2rem;"></i>';
        }

        toast.innerHTML = `${icon}<span>${message}</span>`;
        container.appendChild(toast);

        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transform = 'translateY(10px)';
            toast.style.transition = 'all 0.3s ease';
            setTimeout(() => toast.remove(), 300);
        }, 3500);
    }

    // Expose APIs Globally
    window.showAppConfirm = showAppConfirm;
    window.showAppAlert = showAppAlert;
    window.showAppToast = showAppToast;
    window.customConfirm = showAppConfirm; // Compatibility with admin dashboard
    window.appConfirm = showAppConfirm;
    window.appAlert = showAppAlert;

})();
