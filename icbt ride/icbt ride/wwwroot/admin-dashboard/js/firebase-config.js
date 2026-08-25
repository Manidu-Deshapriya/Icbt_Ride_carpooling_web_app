import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getFirestore, collection, getDocs, addDoc, updateDoc, doc, deleteDoc, query, orderBy, onSnapshot } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { getStorage, ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-storage.js";

const firebaseConfig = {
  apiKey: "AIzaSyCDNy7JdfdBe_g_PC6PkSKeI7bajYen7_8",
  authDomain: "icbtride.firebaseapp.com",
  projectId: "icbtride",
  storageBucket: "icbtride.firebasestorage.app",
  messagingSenderId: "135772791460",
  appId: "1:135772791460:web:36e9ea5104c4ad8206bc31",
  measurementId: "G-GS4SQESX7F"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

window.firebaseAuth = auth;
window.firebaseDb = db;
window.signInWithEmailAndPassword = signInWithEmailAndPassword;
window.onAuthStateChanged = onAuthStateChanged;
window.signOut = signOut;

// Export Firestore functions for CRUD operations
window.fsCollection = collection;
window.fsGetDocs = getDocs;
window.fsAddDoc = addDoc;
window.fsUpdateDoc = updateDoc;
window.fsDoc = doc;
window.fsDeleteDoc = deleteDoc;
window.fsQuery = query;
window.fsOrderBy = orderBy;
window.fsOnSnapshot = onSnapshot;

// Export Storage functions
window.firebaseStorage = storage;
window.storageRef = ref;
window.storageUploadBytes = uploadBytes;
window.storageGetDownloadURL = getDownloadURL;

// Global Notification Logic for Bell Icon
document.addEventListener('DOMContentLoaded', () => {
  // Only run if the user is on an admin page with the notification badge
  const badge = document.getElementById('notificationBadge');
  if (badge) {
    onAuthStateChanged(auth, (user) => {
      if (user) {
        const usersCol = collection(db, 'users');
        onSnapshot(usersCol, (snapshot) => {
          let pendingCount = 0;
          snapshot.forEach(doc => {
            const data = doc.data();
            if (data.status === 'pending') {
              pendingCount++;
            }
          });

          if (pendingCount > 0) {
            badge.textContent = pendingCount;
            badge.classList.remove('d-none');
          } else {
            badge.classList.add('d-none');
          }
        });
      }
    });
  }
});

// Custom Modals
window.customAlert = function (message, type = 'success') {
  const existing = document.getElementById('customAlertModal');
  if (existing) existing.remove();

  const icon = type === 'success' ? '<i class="fa-solid fa-circle-check text-success fs-1 mb-3"></i>' : '<i class="fa-solid fa-circle-xmark text-danger fs-1 mb-3"></i>';

  const modalHtml = `
    <div class="modal fade" id="customAlertModal" tabindex="-1" aria-hidden="true" style="z-index: 9999;">
        <div class="modal-dialog modal-dialog-centered modal-sm">
            <div class="modal-content" style="background: var(--bg-card, #151F32); border: 1px solid var(--border-color, rgba(255,255,255,0.1)); text-align: center; padding: 30px 20px;">
                ${icon}
                <h6 class=" mb-4" style="line-height: 1.5;">${message}</h6>
                <button type="button" class="btn btn-primary w-100 rounded-pill" data-bs-dismiss="modal">OK</button>
            </div>
        </div>
    </div>`;
  document.body.insertAdjacentHTML('beforeend', modalHtml);
  const modal = new bootstrap.Modal(document.getElementById('customAlertModal'));
  modal.show();
}

window.customConfirm = function (message) {
  return new Promise((resolve) => {
    const existing = document.getElementById('customConfirmModal');
    if (existing) existing.remove();

    const modalHtml = `
        <div class="modal fade" id="customConfirmModal" tabindex="-1" aria-hidden="true" style="z-index: 9999;">
            <div class="modal-dialog modal-dialog-centered">
                <div class="modal-content" style="background: var(--bg-card, #151F32); border: 1px solid var(--border-color, rgba(255,255,255,0.1)); padding: 30px; text-align: center;">
                    <i class="fa-solid fa-circle-question text-warning fs-1 mb-3"></i>
                    <h5 class=" mb-4" style="line-height: 1.5;">${message}</h5>
                    <div class="d-flex gap-3 justify-content-center mt-2">
                        <button type="button" class="btn  w-50 rounded-pill" style="background: rgba(255,255,255,0.1);" data-bs-dismiss="modal" id="confirmNoBtn">Cancel</button>
                        <button type="button" class="btn btn-primary w-50 rounded-pill" id="confirmYesBtn">Yes, Proceed</button>
                    </div>
                </div>
            </div>
        </div>`;
    document.body.insertAdjacentHTML('beforeend', modalHtml);
    const modalEl = document.getElementById('customConfirmModal');
    const modal = new bootstrap.Modal(modalEl);

    let resolved = false;

    document.getElementById('confirmYesBtn').addEventListener('click', () => {
      if (!resolved) { resolved = true; resolve(true); }
      modal.hide();
    });
    document.getElementById('confirmNoBtn').addEventListener('click', () => {
      if (!resolved) { resolved = true; resolve(false); }
      modal.hide();
    });
    modalEl.addEventListener('hidden.bs.modal', () => {
      if (!resolved) { resolved = true; resolve(false); }
    });

    modal.show();
  });
}
