const admin = require('firebase-admin');
const path = require('path');
const fs = require('fs');

const serviceAccountPath = path.join(__dirname, '..', 'serviceAccountKey.json');

try {
  if (fs.existsSync(serviceAccountPath)) {
    const serviceAccount = require(serviceAccountPath);
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      projectId: process.env.FIREBASE_PROJECT_ID || 'icbtride',
      storageBucket: process.env.FIREBASE_STORAGE_BUCKET || 'icbtride.firebasestorage.app'
    });
    console.log('[Firebase Admin] Initialized with Service Account Key');
  } else {
    // Initialize with project ID default configuration
    admin.initializeApp({
      projectId: process.env.FIREBASE_PROJECT_ID || 'icbtride',
      storageBucket: process.env.FIREBASE_STORAGE_BUCKET || 'icbtride.firebasestorage.app'
    });
    console.log('[Firebase Admin] Initialized with Project ID:', process.env.FIREBASE_PROJECT_ID || 'icbtride');
  }
} catch (error) {
  console.warn('[Firebase Admin] Initialization warning:', error.message);
}

const db = admin.firestore ? admin.firestore() : null;
const auth = admin.auth ? admin.auth() : null;

module.exports = {
  admin,
  db,
  auth
};
