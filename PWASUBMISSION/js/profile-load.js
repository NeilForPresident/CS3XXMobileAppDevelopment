// js/profile-load.js
import { auth, db } from "./firebase-config.js";
import {
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-auth.js";
import {
  doc,
  onSnapshot,
  collection
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";

function listenToFriendCount(uid) {
  const friendsRef = collection(db, "users", uid, "friends");
  onSnapshot(friendsRef, (snapshot) => {
    // Filter out placeholders if you created them at user creation
    const realFriends = snapshot.docs.filter((d) => !d.data()._placeholder);
    const count = realFriends.length;

    // Find the correct <li> span in your stats section
    const statsItems = document.querySelectorAll(".stats ul li span:last-child");
    // Your "Friends" is likely the 4th item (index 3)
    if (statsItems.length >= 4) {
      statsItems[3].textContent = count;
    }
  });
}

onAuthStateChanged(auth, (user) => {
  if (!user) return; // Not signed in

  const userRef = doc(db, "users", user.uid);

  // Real-time listener for profile updates
onSnapshot(userRef, (docSnap) => {
    if (!docSnap.exists()) {
      console.log("No Firestore user document found");
      return;
    }

    const data = docSnap.data();
    console.log("Loaded user data:", data);

    // Populate the profile info section in landing.html
    const profileName = document.querySelector(".profile-info h2");
    const profileDetails = document.querySelector(".profile-info p");

    if (profileName) profileName.textContent = data.displayName || "No name";
    if (profileDetails) {
      const joinDate = data.createdAt
        ? new Date(data.createdAt.seconds * 1000).toLocaleDateString()
        : "—";
      profileDetails.innerHTML = `
        Member since ${joinDate}<br>
        ${data.userTag || ""}
      `;
    }

    // Populate stats if available
    if (data.stats) {
      const statItems = document.querySelectorAll(".stats ul li span:first-child + span");
      // This assumes your stats list is in this order:
      // Total Drops, Total Distance, Bounces, Friends
      if (statItems.length >= 3) {
        statItems[0].textContent = data.stats.totalDrops ?? 0;
        statItems[1].textContent = parseFloat(data.stats.totalDistance).toFixed(2) ?? 0;
        statItems[2].textContent = data.stats.totalBounces ?? 0;
      }
    }
  });
  listenToFriendCount(user.uid);
});
