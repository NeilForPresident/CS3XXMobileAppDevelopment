// js/leaderboard.js
import { db } from "./firebase-config.js";
import {
  collection, query, orderBy, limit, onSnapshot
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";

const board = document.querySelector(".leaderboard");

function renderBoard(docs) {
  board.innerHTML = "";
  docs.forEach((docSnap, i) => {
    const user = docSnap.data();
    const li = document.createElement("li");
    li.innerHTML = `
      <div class="user-wrap">
        <div class="avatar-sm"></div>
        <span>${user.displayName || "User"}</span>
      </div>
      <div class="score">${(parseFloat(user.stats?.totalDistance).toFixed(2) || 0)}</div>
      <div class="arrow">›</div>
    `;
    board.appendChild(li);
  });
}

const q = query(collection(db, "users"), orderBy("stats.totalDistance", "desc"), limit(10));
onSnapshot(q, (snap) => {
  renderBoard(snap.docs);
});
