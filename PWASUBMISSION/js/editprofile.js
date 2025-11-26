// js/editprofile.js
import { auth, db } from "./firebase-config.js";
import {
  updateProfile
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-auth.js";
import {
  doc, updateDoc
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";

const nameInput = document.getElementById("displayName");
const saveBtn = document.getElementById("saveChanges");

saveBtn.addEventListener("click", async () => {
  const user = auth.currentUser;
  const newName = nameInput.value.trim();
  if (!user) return alert("You must be signed in.");
  if (!newName) return alert("Name cannot be empty.");

  try {
    // Update Firebase Auth profile
    await updateProfile(user, { displayName: newName });

    // Update Firestore doc
    const userRef = doc(db, "users", user.uid);
    await updateDoc(userRef, { displayName: newName });

    alert("Display name updated!");
  } catch (err) {
    console.error(err);
    alert("Error updating display name.");
  }
});
