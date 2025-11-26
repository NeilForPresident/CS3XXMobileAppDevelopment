import { auth, db } from "./firebase-config.js";
import {
  collection,
  onSnapshot,
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-auth.js";

const list = document.getElementById("notableList");

onAuthStateChanged(auth, (user) => {
  if (!user) return;

  const notableRef = collection(db, "users", user.uid, "notableFalls");

  onSnapshot(notableRef, (snap) => {
    list.innerHTML = "";

    if (snap.empty) {
      list.innerHTML = "<li><em>No notable falls yet.</em></li>";
      return;
    }

    snap.docs
      .sort((a, b) => b.data().createdAt - a.data().createdAt)
      .forEach((docSnap) => {
        const d = docSnap.data();
        const li = document.createElement("li");

        li.innerHTML = `
          <div class="fall-info">
            <h3>💥 ${d.height.toFixed(2)}m drop</h3>
            <p>${d.note || "No note provided."}</p>
            <span class="date">
              ${d.createdAt.toDate().toLocaleDateString()}
            </span>
          </div>
        `;

        list.appendChild(li);
      });
  });
});
