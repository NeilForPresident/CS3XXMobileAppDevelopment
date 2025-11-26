import { auth, db } from "./firebase-config.js";
import {
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-auth.js";
import {
  doc,
  onSnapshot
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";

const avatarEl = document.getElementById("chartsAvatar");
const usernameEl = document.getElementById("chartsUsername");

onAuthStateChanged(auth, (user) => {
  if (!user) return;

  const ref = doc(db, "users", user.uid);

  // Live updates
  onSnapshot(ref, (snap) => {
    if (!snap.exists()) return;

    const data = snap.data();

    // Username
    if (usernameEl) {
      usernameEl.textContent = data.displayName || "Unnamed User";
    }

    // Avatar
    if (avatarEl) {
      avatarEl.src = data.photoURL || "avatar-placeholder.png";
    }
  });
});
