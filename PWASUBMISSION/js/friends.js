// js/friends.js
import { auth, db } from "./firebase-config.js";
import {
  collection,
  query,
  where,
  getDocs,
  addDoc,
  doc,
  setDoc,
  deleteDoc,
  onSnapshot,
  serverTimestamp,
  updateDoc,
  increment
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";

import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-auth.js";

// DOM elements
const searchInput = document.getElementById("searchInput");
const searchBtn = document.getElementById("searchBtn");
const searchResults = document.getElementById("searchResults");
const requestsList = document.getElementById("friendRequests");
const friendsList = document.getElementById("friendsList");

// Will contain userTag, displayName, photoURL, etc.
let currentUserData = null;

// MAIN LISTENER
onAuthStateChanged(auth, (user) => {
  if (!user) return;

  const userId = user.uid;

  // Load current user's Firestore profile
  const ref = doc(db, "users", userId);
  onSnapshot(ref, (snap) => {
    currentUserData = snap.data();
  });

  loadSearch(user, userId);
  loadIncomingRequests(user, userId);
  loadFriendsList(user, userId);
});

// ─────────────────────────────────────────────────────
// SEARCH USERS BY FRIEND CODE
// ─────────────────────────────────────────────────────

function loadSearch(user, userId) {
  searchBtn.addEventListener("click", async () => {
    const friendCode = searchInput.value.trim().toUpperCase();
    searchResults.innerHTML = "";

    if (!friendCode.startsWith("USER#")) {
      searchResults.innerHTML = "<li>Invalid friend code.</li>";
      return;
    }

    const usersRef = collection(db, "users");
    const q = query(usersRef, where("userTag", "==", friendCode));
    const snap = await getDocs(q);

    if (snap.empty) {
      searchResults.innerHTML = "<li>No users found.</li>";
      return;
    }

    snap.forEach((docSnap) => {
      const data = docSnap.data();
      const targetId = docSnap.id;

      if (targetId === userId) {
        searchResults.innerHTML = "<li>You can't add yourself.</li>";
        return;
      }

      const li = document.createElement("li");
      li.innerHTML = `
        <div class="user-result">
          <strong>${data.displayName}</strong>
          <p>${data.userTag}</p>
          <button class="add-btn">Add</button>
        </div>
      `;

      li.querySelector(".add-btn").addEventListener("click", async () => {
        try {
          await addDoc(collection(db, "users", targetId, "friendRequests"), {
            fromUid: userId,
            fromName: currentUserData.displayName,
            fromTag: currentUserData.userTag,
            fromPhoto: currentUserData.photoURL || "",
            createdAt: serverTimestamp()
          });
          alert(`Friend request sent to ${data.displayName}`);
        } catch (err) {
          console.error("Error sending friend request: ", err);
        }
      });

      searchResults.appendChild(li);
    });
  });
}

// ─────────────────────────────────────────────────────
// INCOMING REQUESTS
// ─────────────────────────────────────────────────────

function loadIncomingRequests(user, userId) {
  onSnapshot(collection(db, "users", userId, "friendRequests"), (snap) => {
    requestsList.innerHTML = "";

    if (snap.empty) {
      requestsList.innerHTML = "<li>No incoming requests.</li>";
      return;
    }

    snap.forEach((docSnap) => {
      const data = docSnap.data();

      const li = document.createElement("li");
      li.innerHTML = `
        <span>${data.fromName} (${data.fromTag})</span>
        <div class="req-buttons">
          <button class="accept">Accept</button>
          <button class="decline">Decline</button>
        </div>
      `;

      const acceptBtn = li.querySelector(".accept");
      const declineBtn = li.querySelector(".decline");

      // ACCEPT REQUEST
      acceptBtn.addEventListener("click", async () => {
        try {
          const senderUid = data.fromUid;

          const userRef = doc(db, "users", userId);
          const senderRef = doc(db, "users", senderUid);

          const friendInfo = {
            name: data.fromName,
            tag: data.fromTag,
            photoURL: data.fromPhoto || "",
            since: serverTimestamp()
          };

          const myInfo = {
            name: currentUserData.displayName,
            tag: currentUserData.userTag,
            photoURL: currentUserData.photoURL || "",
            since: serverTimestamp()
          };

          // MUTUAL FRIEND ADD
          await setDoc(doc(db, "users", userId, "friends", senderUid), friendInfo);
          await setDoc(doc(db, "users", senderUid, "friends", userId), myInfo);

          // DELETE REQUEST
          await deleteDoc(doc(db, "users", userId, "friendRequests", docSnap.id));

          // SEND NOTIFICATION
          await addDoc(collection(db, "users", senderUid, "notifications"), {
            title: "Friend Request Accepted!",
            body: `${currentUserData.displayName} is now your friend!`,
            createdAt: serverTimestamp(),
            read: false,
            linkTo: "friends.html"
          });

          // UPDATE STATS FOR BOTH USERS
          await updateDoc(userRef, { "stats.friends": increment(1) });
          await updateDoc(senderRef, { "stats.friends": increment(1) });

          alert(`You and ${data.fromName} are now friends!`);
        } catch (err) {
          console.error("🔥 Accept Request Error:", err);
        }
      });

      // DECLINE REQUEST
      declineBtn.addEventListener("click", async () => {
        await deleteDoc(doc(db, "users", userId, "friendRequests", docSnap.id));
      });

      requestsList.appendChild(li);
    });
  });
}

// ─────────────────────────────────────────────────────
// FRIEND LIST
// ─────────────────────────────────────────────────────

function loadFriendsList(user, userId) {
  onSnapshot(collection(db, "users", userId, "friends"), (snap) => {
    friendsList.innerHTML = "";

    if (snap.empty) {
      friendsList.innerHTML = "<li>No friends yet.</li>";
      return;
    }

    snap.forEach((docSnap) => {
      const data = docSnap.data();
      const friendId = docSnap.id;

      const li = document.createElement("li");
      li.innerHTML = `
        <div class="user-wrap">
          <img class="avatar-sm" src="${data.photoURL || 'avatar-placeholder.png'}">
          <span>@${data.name}</span>
        </div>
        <div class="friend-buttons">
          <button class="remind-btn">Remind</button>
          <button class="remove-btn">Remove</button>
        </div>
      `;

      // SEND REMINDER
      li.querySelector(".remind-btn").addEventListener("click", async () => {
        try {
          await addDoc(collection(db, "users", friendId, "notifications"), {
            title: "BeCareful™ Reminder",
            body: `${currentUserData.displayName} thinks you should be careful 😅`,
            createdAt: serverTimestamp(),
            read: false,
            linkTo: "landing.html#home"
          });
          alert("Reminder sent!");
        } catch (err) {
          console.error("Reminder error: ", err);
        }
      });

      // REMOVE FRIEND
      li.querySelector(".remove-btn").addEventListener("click", async () => {
        if (!confirm("Remove friend?")) return;

        await deleteDoc(doc(db, "users", userId, "friends", friendId));
        await deleteDoc(doc(db, "users", friendId, "friends", userId));
      });

      friendsList.appendChild(li);
    });
  });
}
