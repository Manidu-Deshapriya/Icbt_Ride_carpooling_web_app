import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getFirestore, collection, getDocs, addDoc, updateDoc, doc, deleteDoc, query, orderBy } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

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
