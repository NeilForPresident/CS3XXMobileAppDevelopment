// js/sensors.js
import { auth, db } from "./firebase-config.js";
import {
  doc,
  updateDoc,
  increment,
  addDoc,
  collection,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";

// Motion state
let freeFallStart = null;
let lastAcceleration = 9.8;

// Modal elements
const modal = document.getElementById("confirm-fall-modal");
const yesBtn = document.getElementById("fall-yes");
const noBtn = document.getElementById("fall-no");

// Notable fall UI
const notableText = document.getElementById("notable-text");
const notableSave = document.getElementById("notable-save");
const notableSkip = document.getElementById("notable-skip");

// Last fall data storage
let lastFall = { height: 0, bounces: 0 };


// ===============================================================
// ENABLE SENSORS
// ===============================================================
export async function enableSensors() {
  // iOS permission
  if (typeof DeviceMotionEvent.requestPermission === "function") {
    try {
      const permission = await DeviceMotionEvent.requestPermission();
      if (permission !== "granted") {
        alert("Motion permission denied. Enable it in Safari Settings.");
        return;
      }
    } catch (err) {
      console.error("Permission error:", err);
      return;
    }
  }

  window.addEventListener("devicemotion", handleMotion);
  console.log("✅ Motion sensors active");
}


// ===============================================================
// MOTION HANDLER
// ===============================================================
function handleMotion(event) {
  const a = event.accelerationIncludingGravity;
  if (!a) return;

  const magnitude = Math.sqrt(a.x ** 2 + a.y ** 2 + a.z ** 2);

  // Start of free fall
  if (magnitude < 2 && !freeFallStart) {
    freeFallStart = performance.now();
  }

  // End of free fall (impact)
  if (freeFallStart && magnitude > 18) {
    const fallDuration = (performance.now() - freeFallStart) / 1000;
    const estimatedDistance = 0.5 * 9.8 * Math.pow(fallDuration, 2);

    console.log(`💥 Fall detected — approx ${estimatedDistance.toFixed(2)}m`);

    showConfirmModal(estimatedDistance);

    freeFallStart = null;
  }

  lastAcceleration = magnitude;
}


// ===============================================================
// SHOW CONFIRMATION POPUP
// ===============================================================
function showConfirmModal(distance) {
  lastFall.height = distance;
  modal.dataset.distance = distance;

  // Reset UI to the initial state
  modal.classList.remove("detecting-bounces", "showing-notable");
  notableText.value = "";

  modal.classList.add("active");
}


// ===============================================================
// BOUNCE DETECTOR
// ===============================================================
function detectBounces(callback) {
  let bounces = 0;
  const bounceWindow = 2000; // ms
  const start = performance.now();

  function listener(event) {
    const a = event.accelerationIncludingGravity;
    if (!a) return;

    const magnitude = Math.sqrt(a.x ** 2 + a.y ** 2 + a.z ** 2);

    if (magnitude > 15) {
      bounces++;
      console.log("Bounce detected:", bounces);
    }

    if (performance.now() - start > bounceWindow) {
      window.removeEventListener("devicemotion", listener);
      callback(bounces);
    }
  }

  window.addEventListener("devicemotion", listener);
}


// ===============================================================
// SAVE FALL TO FIRESTORE
// ===============================================================
async function logFall(distance, bounces) {
  const user = auth.currentUser;
  if (!user) return;

  const userRef = doc(db, "users", user.uid);
  const fallsRef = collection(db, "users", user.uid, "falls");
  const notifRef = collection(db, "users", user.uid, "notifications");

  // Update stats
  await updateDoc(userRef, {
    "stats.totalDrops": increment(1),
    "stats.totalDistance": increment(distance),
    "stats.totalBounces": increment(bounces)
  });

  // Save fall
  await addDoc(fallsRef, {
    height: distance,
    bounces,
    createdAt: serverTimestamp(),
    notable: false
  });

  // Notification
  await addDoc(notifRef, {
    title: "Fall recorded!",
    body: `You dropped your phone from ${distance.toFixed(2)}m with ${bounces} bounce${bounces !== 1 ? "s" : ""}.`,
    createdAt: serverTimestamp(),
    read: false,
    linkTo: "landing.html#home"
  });

  console.log("📈 Fall logged");
}


// ===============================================================
// SAVE NOTABLE FALL
// ===============================================================
async function saveNotableFall(note, distance, bounces) {
  const user = auth.currentUser;
  if (!user) return;

  await addDoc(collection(db, "users", user.uid, "notableFalls"), {
    note,
    height: distance,
    bounces,
    createdAt: serverTimestamp()
  });

  console.log("⭐ Notable fall saved");
}


// ===============================================================
// POPUP BUTTON HANDLERS
// ===============================================================

// YES → show bounce detection → log fall → show notable prompt
yesBtn?.addEventListener("click", () => {
  // Immediately switch to the "detecting bounces" view
  modal.classList.add("detecting-bounces");

  detectBounces(async (bounces) => {
    const distance = parseFloat(modal.dataset.distance);

    lastFall.height = distance;
    lastFall.bounces = bounces;

    await logFall(distance, bounces);

    // Switch to the "notable fall" view
    modal.classList.remove("detecting-bounces");
    modal.classList.add("showing-notable");
  });
});

// NO → close popup
noBtn?.addEventListener("click", () => {
  modal.classList.remove("active");
});

// Save notable fall
notableSave?.addEventListener("click", async () => {
  await saveNotableFall(notableText.value.trim(), lastFall.height, lastFall.bounces);
  modal.classList.remove("active");
});

// Skip notable save
notableSkip?.addEventListener("click", () => {
  modal.classList.remove("active");
});

// ===============================================================
//  TEST FUNCTION - SIMULATE A FALL
// ===============================================================
export function simulateFall() {
  console.log("⚡ Simulating a fall event...");
  const randomDistance = Math.random() * 5 + 1; // Random fall between 1m and 6m
  showConfirmModal(randomDistance);
}
