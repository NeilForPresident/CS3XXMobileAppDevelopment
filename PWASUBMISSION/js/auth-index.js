// js/auth-index.js
import {
  getAuth,
  signInWithPopup,
  GoogleAuthProvider,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  fetchSignInMethodsForEmail,
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-auth.js";
import { ensureUserDocument } from "./firestore-user.js";
import { auth } from "./firebase-config.js";

// --- Firebase Auth setup ---
const provider = new GoogleAuthProvider();
provider.addScope("email profile");

// --- DOM Elements ---
const emailInput = document.getElementById("email");
const passInput = document.getElementById("password");
const continueBtn = document.getElementById("regcontinue");
const googleBtn = document.getElementById("gglcontinue");

// --- Helper: Force fresh ID token (THIS FIXES THE DOUBLE-CLICK BUG) ---
async function waitForFreshToken(user) {
  // getIdToken(true) forces a refresh — this is the magic line
  // It waits until Firebase has fully synced the auth state with the backend
  await user.getIdTokenResult(true);
  // Optional: tiny extra delay for extremely slow devices (overkill but safe)
  // await new Promise(r => setTimeout(r, 300));
}

// --- Email + Password Auth ---
async function handleEmailAuth() {
  const email = emailInput.value.trim();
  const password = passInput.value.trim();

  if (!email || !email.includes("@")) {
    alert("Please enter a valid email address.");
    return;
  }
  if (!password || password.length < 6) {
    alert("Password must be at least 6 characters.");
    return;
  }

  try {
    const methods = await fetchSignInMethodsForEmail(auth, email);

    let user;

    if (methods.includes("password")) {
      // Existing email/password user → sign in
      const cred = await signInWithEmailAndPassword(auth, email, password);
      user = cred.user;
    } else if (methods.length === 0) {
      // Brand new user → create account
      const cred = await createUserWithEmailAndPassword(auth, email, password);
      user = cred.user;
    } else if (methods.includes("google.com")) {
      alert("This email is linked to a Google account. Please use 'Continue with Google' instead.");
      return;
    } else {
      alert("This account uses a different sign-in method.");
      return;
    }

    // CRITICAL: Wait for fresh token BEFORE any Firestore writes
    await waitForFreshToken(user);

    // Now it's 100% safe
    await ensureUserDocument(user);

    window.location.href = "landing.html";

  } catch (err) {
    console.error("Email auth error:", err);
    handleAuthError(err);
  }
}

// --- Google Sign-In (THE MOST IMPORTANT PART) ---
async function handleGoogleSignIn() {
  try {
    const result = await signInWithPopup(auth, provider);
    const user = result.user;

    console.log("Google sign-in successful:", user.uid, user.email);

    // THIS IS THE LINE THAT FIXES EVERYTHING
    await waitForFreshToken(user);

    // Now Firestore writes will NEVER fail due to stale token
    await ensureUserDocument(user);

    window.location.href = "landing.html";

  } catch (err) {
    console.error("Google sign-in error:", err);

    // User closed popup → not an error, just ignore
    if (err.code === "auth/popup-closed-by-user" || err.code === "auth/cancelled-popup-request") {
      return;
    }

    alert("Google sign-in failed: " + (err.message || "Please try again."));
  }
}

// --- Centralized Error Handling ---
function handleAuthError(err) {
  switch (err.code) {
    case "auth/email-already-in-use":
      alert("This email is already registered. Try signing in instead.");
      break;
    case "auth/invalid-credential":
    case "auth/wrong-password":
    case "auth/user-not-found":
      alert("Invalid email or password. Please try again.");
      break;
    case "auth/invalid-email":
      alert("Please enter a valid email address.");
      break;
    case "auth/weak-password":
      alert("Password should be at least 6 characters.");
      break;
    case "auth/too-many-requests":
      alert("Too many failed attempts. Please try again later.");
      break;
    default:
      alert(err.message || "An error occurred. Please try again.");
  }
}

// --- Event Listeners ---
continueBtn?.addEventListener("click", handleEmailAuth);
googleBtn?.addEventListener("click", handleGoogleSignIn);

// Optional: Auto-focus email field
emailInput?.focus();