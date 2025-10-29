// Import the functions you need from the SDKs you need
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-analytics.js";
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-auth.js";
import { getDatabase, ref, set, get, update, remove, onValue } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-database.js";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDh7pBtfN3coEghv-dP5urWsk3FkJtMs2c",
  authDomain: "terrasdeebito.firebaseapp.com",
  databaseURL: "https://terrasdeebito-default-rtdb.firebaseio.com",
  projectId: "terrasdeebito",
  storageBucket: "terrasdeebito.firebasestorage.app",
  messagingSenderId: "148960203673",
  appId: "1:148960203673:web:055e2f19289f39de18f908",
  measurementId: "G-MGQ8KGTMX6"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const auth = getAuth(app);
const database = getDatabase(app);
const provider = new GoogleAuthProvider();

export { auth, database, provider, signInWithPopup, signOut, onAuthStateChanged, ref, set, get, update, remove, onValue };
