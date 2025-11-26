// js/leaderboard-friends.js
import { auth, db } from "./firebase-config.js";
import {
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-auth.js";
import {
  collection, doc, getDoc, onSnapshot
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";

const board = document.querySelector(".leaderboard");
const metricSelect = document.getElementById("metricSelect");

// Live update leaderboard when metric changes
metricSelect?.addEventListener("change", () => {
  const user = auth.currentUser;
  if (user) buildLeaderboard(user.uid, metricSelect.value);
});

onAuthStateChanged(auth, (user) => {
  if (user) {
    buildLeaderboard(user.uid, "distance");
  }
});

async function buildLeaderboard(uid, metric) {
  board.innerHTML = "<li>Loading leaderboard...</li>";

  // Listen to your friends collection
  const friendsRef = collection(db, "users", uid, "friends");

  onSnapshot(friendsRef, async (friendsSnap) => {
    const entries = [];

    // Add yourself first
    const selfDoc = await getDoc(doc(db, "users", uid));
    if (selfDoc.exists()) {
      const selfData = selfDoc.data();
      entries.push({
        name: (selfData.displayName || "You") + " (You)",
        stats: selfData.stats || {}
      });
    }

    // Add all your friends
    for (const friend of friendsSnap.docs) {
      const friendId = friend.id;
      const friendDoc = await getDoc(doc(db, "users", friendId));
      if (friendDoc.exists()) {
        const data = friendDoc.data();
        entries.push({
          name: data.displayName || "Unknown",
          stats: data.stats || {}
        });
      }
    }

    // Sort based on selected metric
    const key =
      metric === "drops"
        ? "totalDrops"
        : metric === "bounces"
        ? "totalBounces"
        : "totalDistance";

    entries.sort((a, b) => (b.stats[key] || 0) - (a.stats[key] || 0));

    // Render
    renderLeaderboard(entries, key);
  });
}

function renderLeaderboard(entries, key) {
  board.innerHTML = "";

  if (entries.length === 0) {
    board.innerHTML = "<li>No data available yet.</li>";
    return;
  }

  entries.forEach((entry, i) => {
    const value =
      key === "totalDistance"
        ? (entry.stats[key] || 0).toFixed(2) + "m"
        : entry.stats[key] || 0;

    const li = document.createElement("li");
    li.innerHTML = `
      <div class="user-wrap">
        <span>${i + 1}. ${entry.name}</span>
      </div>
      <div class="score">${value}</div>
    `;
    board.appendChild(li);
  });
}
