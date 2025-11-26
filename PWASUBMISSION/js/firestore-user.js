// js/firestore-user.js
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  runTransaction,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";

import { db } from "./firebase-config.js";

// ───────────────────────────────────────────────
// Generate random user tag USER#1234AB
// ───────────────────────────────────────────────
function generateRandomTag() {
  const letters = Math.random().toString(36).substring(2, 4).toUpperCase();
  const numbers = Math.floor(1000 + Math.random() * 9000);
  return `USER#${numbers}${letters}`;
}

// ───────────────────────────────────────────────
// Safely generate *unique* userTag using transaction.
// Will NEVER perform an update & NEVER violate rules.
// ───────────────────────────────────────────────
async function generateUniqueUserTag() {
  for (let i = 0; i < 10; i++) {
    const tag = generateRandomTag();
    const tagRef = doc(db, "userTags", tag);

    try {
      await runTransaction(db, async (tx) => {
        const snap = await tx.get(tagRef);
        if (snap.exists()) {
          throw new Error("Tag exists"); // Try another tag
        }
        tx.set(tagRef, { reserved: true, createdAt: serverTimestamp() });
      });

      return tag; // Successfully reserved
    } catch (err) {
      // Retry new tag
    }
  }
  throw new Error("Failed to generate unique user tag after 10 attempts");
}

// ───────────────────────────────────────────────
// Ensure user subcollections exist (by creating
// placeholder docs). Safe + allowed by your rules.
// ───────────────────────────────────────────────


// ───────────────────────────────────────────────
// Main: ensure user doc exists & is up to date
// Called after successful login
// ───────────────────────────────────────────────
export async function ensureUserDocument(user) {
  const userRef = doc(db, "users", user.uid);
  const snap = await getDoc(userRef);

  const baseFields = {
    displayName: user.displayName || "Anonymous",
    email: user.email,
    photoURL: user.photoURL || null,
    private: false,
    lastLoginAt: serverTimestamp(),
  };

  // ───────────────────────────
  // NEW USER → create document
  // ───────────────────────────
  if (!snap.exists()) {
    console.log("🆕 Creating new user document...");

    // 1. Create the document FIRST with a placeholder tag.
    // This ensures the user document exists for subsequent security rule checks.
    await setDoc(userRef, {
      ...baseFields,
      createdAt: serverTimestamp(),
      userTag: null, // Placeholder
      stats: {
        totalDrops: 0,
        totalDistance: 0,
        totalBounces: 0,
        friends: 0,
      },
    });

    // 2. Now that the user doc exists, generate the unique tag.
    // This transaction will now pass security rules that check for the user's existence.
    const tag = await generateUniqueUserTag();

    // 3. Update the document with the real userTag.
    await updateDoc(userRef, { userTag: tag });

    // 4. Create required subcollections.
   
    return;
  }

  // ───────────────────────────
  // EXISTING USER → update doc
  // ───────────────────────────
  console.log("♻️ Updating existing user document...");
  const data = snap.data();
  const updates = { ...baseFields };

  // Assign missing userTag (rare case)
  if (!data.userTag) {
    updates.userTag = await generateUniqueUserTag();
  }

  // Assign missing stats object
  if (!data.stats) {
    updates.stats = {
      totalDrops: 0,
      totalDistance: 0,
      totalBounces: 0,
      friends: 0,
    };
  }

  await updateDoc(userRef, updates);
}
