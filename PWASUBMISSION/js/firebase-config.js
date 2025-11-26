import { initializeApp } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-app.js";
import { getAuth, GoogleAuthProvider } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "putapikeyhere",
  authDomain: "becareful-5b379.firebaseapp.com",
  projectId: "becareful-5b379",
  storageBucket: "becareful-5b379.firebasestorage.app",
  messagingSenderId: "1065102825155",
  appId: "1:1065102825155:web:0861acf09f8b0f5b5ab476",
  measurementId: "G-Y9CT9SRJ8Z"
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const googleProvider = new GoogleAuthProvider();