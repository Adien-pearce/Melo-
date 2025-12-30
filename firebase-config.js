import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { getAuth, signInAnonymously, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { getFirestore, doc, setDoc, onSnapshot, collection, query, addDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

// Use global variables provided by the environment
const APP_ID = typeof __app_id !== 'undefined' ? __app_id : 'default-melo-app';
let firebaseConfig = {};
try {
    firebaseConfig = JSON.parse(typeof __firebase_config !== 'undefined' ? __firebase_config : '{}');
} catch (e) {
    console.error("Firebase config parsing failed:", e);
}

window.firebaseImports = {
    addDoc,
    collection,
    query,
    onSnapshot,
    serverTimestamp,
    setDoc,
    doc,
    getAuth,
    APP_ID
};

// Initialize Firebase
if (Object.keys(firebaseConfig).length > 0) {
    const app = initializeApp(firebaseConfig);
    const db = getFirestore(app);
    const auth = getAuth(app);
    
    window.db = db;
    
    onAuthStateChanged(auth, (user) => {
        if (user) {
            window.userId = user.uid;
            document.dispatchEvent(new CustomEvent('auth-ready'));
        } else {
            signInAnonymously(auth).catch(console.error);
        }
    });
} else {
    console.warn("No Firebase config found. App will run in local-only mode.");
    window.userId = 'guest-' + Math.random().toString(36).substring(2, 9);
    setTimeout(() => {
        document.dispatchEvent(new CustomEvent('auth-ready'));
    }, 500);
}