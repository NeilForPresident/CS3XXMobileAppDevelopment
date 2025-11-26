import { auth, db } from "./firebase-config.js";
import {
  collection, doc, getDoc, onSnapshot
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";

const leaderboardList = document.querySelector(".leaderboard");
const metricSelect = document.getElementById("metricSelect");

let friends = [];
let userId = null;

// MAIN
auth.onAuthStateChanged(async (user) => {
  if (!user) return;
  userId = user.uid;

  // Step 1 — Load friends FIRST
  onSnapshot(collection(db, "users", userId, "friends"), async (snap) => {
    friends = snap.docs.map((d) => d.id);

    if (friends.length === 0) {
      leaderboardList.innerHTML = "<li>No friends added yet.</li>";
      return;
    }

    // Step 2 — Load leaderboard AFTER friends are known
    loadLeaderboard();
  });
});

// Re-render when metric changes
metricSelect.addEventListener("change", loadLeaderboard);


async function loadLeaderboard() {

  if (!userId || friends.length === 0) return;

  leaderboardList.innerHTML = "Loading...";

  const metric = metricSelect.value; // 'distance', 'drops', 'bounces'
  const entries = [];


  // Add yourself first
    const selfDoc = await getDoc(doc(db, "users", userId));
    if (selfDoc.exists()) {
      const selfData = selfDoc.data();
      entries.push({
        name: (selfData.displayName || "You") + " (You)",
        value:
          metric === "distance"
            ? (parseFloat(selfData.stats?.totalDistance).toFixed(2) || 0)
            : metric === "drops"
            ? (selfData.stats?.totalDrops || 0)
            : (selfData.stats?.totalBounces || 0)
      });
    }

  // Fetch stats for EACH friend (no global scans)
  for (const fid of friends) {
    const ref = doc(db, "users", fid);
    const snap = await getDoc(ref);

    if (!snap.exists()) continue;

    const data = snap.data();

    entries.push({
      name: data.displayName || "Unknown",
      tag: data.userTag || "",
      photoURL: data.photoURL || "",
      value:
        metric === "distance"
          ? (parseFloat(data.stats?.totalDistance).toFixed(2) || 0)
          : metric === "drops"
          ? (data.stats?.totalDrops || 0)
          : (data.stats?.totalBounces || 0)
    });
  }

  // Sort
  entries.sort((a, b) => b.value - a.value);

  // Render
  leaderboardList.innerHTML = entries
    .map(
      (e) => `
    <li>
      <div class="user-wrap">
        <img class="avatar-sm" src="${e.photoURL || "avatar-placeholder.png"}">
        <span>${e.name}</span>
      </div>
      <div class="score">${e.value}</div>
    </li>`
    )
    .join("");
}
