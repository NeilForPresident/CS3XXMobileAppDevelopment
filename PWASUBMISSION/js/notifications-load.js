// js/notifications-load.js

import { auth, db } from "./firebase-config.js";
import {
  collection,
  onSnapshot,
  doc,
  updateDoc
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";

import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-auth.js";

// Capacitor Native Notifications
const LocalNotifications = window.Capacitor?.Plugins?.LocalNotifications;

const container = document.getElementById("notificationsContainer");

function formatDate(timestamp) {
  if (!timestamp) return "";
  const date = timestamp.toDate();
  return date.toLocaleString("default", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
}

onAuthStateChanged(auth, (user) => {
  if (!user) return;

  const notifRef = collection(db, "users", user.uid, "notifications");

  onSnapshot(notifRef, async (snap) => {

    // ---------------------------------------------------
    // ⭐ NEW: Native Android Notifications on new items
    // ---------------------------------------------------
    snap.docChanges().forEach(async (change) => {
      if (change.type === "added") {
        const newNotif = change.doc.data();

        if (!newNotif.read && LocalNotifications && Capacitor.isNativePlatform()) {
          await LocalNotifications.requestPermissions();

          await LocalNotifications.schedule({
          notifications: [
        {
        id: Date.now(),
        title: newNotif.title || "BeCareful™",
        body: newNotif.body || "You have a new notification.",
        schedule: { at: new Date(Date.now() + 300) }
      }
    ]
  });
}

      }
    });

    // ---------------------------------------------------
    // Existing in-app HTML rendering stays EXACTLY the same
    // ---------------------------------------------------
    container.innerHTML = "";

    if (snap.empty) {
      container.innerHTML = "<li><em>No notifications yet.</em></li>";
      return;
    }

    snap.docs
      .sort((a, b) => b.data().createdAt - a.data().createdAt)
      .forEach(async (docSnap) => {
        const data = docSnap.data();
        const li = document.createElement("li");

        li.className = data.read ? "notification-item" : "notification-item unread";

        li.innerHTML = `
          <span class="notification-title">${data.title || "Notification"}</span>
          <span class="notification-body">${data.body || ""}</span>
          <span class="notification-date">${formatDate(data.createdAt)}</span>
        `;

        // Mark as read when tapped
        li.addEventListener("click", async () => {
          if (!data.read) {
            await updateDoc(doc(db, "users", user.uid, "notifications", docSnap.id), {
              read: true
            });
          }
          if (data.linkTo) {
            window.location.href = data.linkTo;
          }
        });

        container.appendChild(li);
      });
  });
});
