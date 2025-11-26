// auth-init.js
import { auth } from "./firebase-config.js";
import { ensureUserDocument } from "./firestore-user.js";
import { onAuthStateChanged } from 
  "https://www.gstatic.com/firebasejs/10.13.0/firebase-auth.js";

onAuthStateChanged(auth, async (user) => {
  if (!user) return;

  // Ensure Firestore user doc ONLY after full auth initialization
  await ensureUserDocument(user);
});
