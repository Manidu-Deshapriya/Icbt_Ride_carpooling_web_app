// Firebase Configuration
// Common configuration file for all ICBT Ride applications

const firebaseConfig = {
    apiKey: "AIzaSyCDNy7JdfdBe_g_PC6PkSKeI7bajYen7_8",
    authDomain: "icbtride.firebaseapp.com",
    projectId: "icbtride",
    storageBucket: "icbtride.firebasestorage.app",
    messagingSenderId: "135772791460",
    appId: "1:135772791460:web:36e9ea5104c4ad8206bc31",
    measurementId: "G-GS4SQESX7F"
};

// Initialize Firebase if not already initialized
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}

// Initialize Firestore
window.db = firebase.firestore();
