// js/home-load.js
import { auth, db } from "./firebase-config.js";
import {
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-auth.js";
import {
  doc,
  onSnapshot,
  collection,
  query,
  where,
  getDocs
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";

onAuthStateChanged(auth, (user) => {
  if (!user) return;

  const userRef = doc(db, "users", user.uid);

  // --- LIVE USER STATS ON HOME PAGE ---
  onSnapshot(userRef, (snap) => {
    if (!snap.exists()) return;

    const data = snap.data();
    const stats = data.stats || {};

    // Total drops (big number in the circle)
    const dropsEl = document.querySelector("#home .circle h2");
    if (dropsEl) dropsEl.textContent = stats.totalDrops ?? 0;

  });

  // --- FILTERED HISTORY SECTION (MONTHS / WEEKS) ---
  const monthSelect = document.querySelector("#home select:nth-child(1)");
  const periodSelect = document.querySelector("#home select:nth-child(2)");

  async function updateFilteredStats() {
    const months = parseInt(monthSelect.value || "1");
    const period = periodSelect.value;

    // Start date filter
    const now = new Date();
    let startDate = new Date();

    if (period === "MONTHS") startDate.setMonth(now.getMonth() - months);
    if (period === "WEEKS") startDate.setDate(now.getDate() - months * 7);

    const fallsRef = collection(db, "users", user.uid, "falls");
    const q = query(fallsRef, where("createdAt", ">=", startDate));

    const snap = await getDocs(q);

    let dropCount = 0;

    snap.forEach((doc) => {
      if (!doc.data()._placeholder) dropCount++;
    });

    // Update UI
    const dropsEl = document.querySelector("#home .circle h2");
    if (dropsEl) dropsEl.textContent = dropCount;
  }

  monthSelect?.addEventListener("change", updateFilteredStats);
  periodSelect?.addEventListener("change", updateFilteredStats);



async function updateFilteredStats() {
  const monthKey = document.querySelector("#monthDropdown")?.value;
  const range = document.querySelector("#rangeSelect")?.value;

  if (!monthKey) return;

  let [year, month] = monthKey.split("-");
  year = parseInt(year);
  month = parseInt(month);

  const start = new Date(year, month, 1);
  const end = new Date(year, month + 1, 1);

  const fallsRef = collection(db, "users", user.uid, "falls");
  const q = query(fallsRef, where("createdAt", ">=", start), where("createdAt", "<", end));

  const snap = await getDocs(q);

  let dropCount = 0;
  snap.forEach((docSnap) => {
    if (!docSnap.data()._placeholder) dropCount++;
  });

  const h2 = document.querySelector("#home .circle h2");
  if (h2) h2.textContent = dropCount;
}

document.querySelector("#monthDropdown")?.addEventListener("change", updateFilteredStats);
document.querySelector("#rangeSelect")?.addEventListener("change", updateFilteredStats);


  // --- DYNAMIC MONTH DROPDOWN ---
async function populateMonthDropdown() {
  const monthDropdown = document.querySelector("#monthDropdown");
  if (!monthDropdown) return;

  const fallsRef = collection(db, "users", user.uid, "falls");
  const snap = await getDocs(fallsRef);

  const months = new Set();

  snap.forEach((docSnap) => {
    const data = docSnap.data();
    if (data.createdAt && !data._placeholder) {
      const date = data.createdAt.toDate();
      const key = `${date.getFullYear()}-${date.getMonth()}`;
      months.add(key);
    }
  });

  // Clear dropdown
  monthDropdown.innerHTML = "";

  if (months.size === 0) {
    monthDropdown.innerHTML = `<option>No data</option>`;
    return;
  }

  // Convert to sorted array (latest first)
  const sorted = [...months].sort((a, b) => (a < b ? 1 : -1));

  sorted.forEach((m) => {
    let [year, monthIndex] = m.split("-");
    monthIndex = parseInt(monthIndex);

    const date = new Date(year, monthIndex);
    const label = date.toLocaleString("default", { month: "long", year: "numeric" });

    const opt = document.createElement("option");
    opt.value = m;
    opt.textContent = label;
    monthDropdown.appendChild(opt);
  });
}

populateMonthDropdown();



});
