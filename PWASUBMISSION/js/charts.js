// js/charts.js
import { auth, db } from "./firebase-config.js";
import {
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-auth.js";
import {
  collection,
  query,
  orderBy,
  getDocs,
  doc,
  getDoc
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";

let chart;

// Dropdowns
const typeSelect = document.querySelector(".dropdowns select:nth-child(1)");
const yearSelect = document.querySelector(".dropdowns select:nth-child(2)");
const rangeSelect = document.querySelector(".dropdowns select:nth-child(3)");

// DOM summary
const totalDrops = document.getElementById("totalDrops");
const totalDistance = document.getElementById("totalDistance");
const totalBounces = document.getElementById("totalBounces");

// ========= LOAD ON PAGE START ==========
window.addEventListener("DOMContentLoaded", () => {
  onAuthStateChanged(auth, async (user) => {
    if (!user) return;
    await populateYearDropdown(user);
    await renderChart(user);
  });
});

// ========= POPULATE YEARS BASED ON FALL HISTORY ==========
async function populateYearDropdown(user) {
  const fallsRef = collection(db, "users", user.uid, "falls");
  const q = query(fallsRef, orderBy("createdAt", "asc"));
  const snap = await getDocs(q);

  const years = new Set();
  snap.forEach((docSnap) => {
    const d = docSnap.data();
    if (!d.createdAt) return;
    years.add(d.createdAt.toDate().getFullYear());
  });

  if (years.size === 0) {
    // If no data, default to current year
    const now = new Date().getFullYear();
    yearSelect.innerHTML = `<option>${now}</option>`;
    return;
  }

  // Populate dropdown
  yearSelect.innerHTML = "";
  [...years].sort().forEach((y) => {
    const opt = document.createElement("option");
    opt.value = y;
    opt.textContent = y;
    yearSelect.appendChild(opt);
  });
}

// ========= CORE RENDER FUNCTION ==========
async function renderChart(user) {
  const fallsRef = collection(db, "users", user.uid, "falls");
  const q = query(fallsRef, orderBy("createdAt", "asc"));
  const snap = await getDocs(q);

  const selectedType = typeSelect.value.toLowerCase();
  const selectedYear = parseInt(yearSelect.value);
  const grouping = rangeSelect.value.toLowerCase();

  const points = [];

  snap.forEach((docSnap) => {
    const d = docSnap.data();
    if (!d.createdAt) return;

    const date = d.createdAt.toDate();
    if (date.getFullYear() !== selectedYear) return;

    let value = 1; // Drops = count
    if (selectedType.includes("distance")) value = d.height ?? 0;
    if (selectedType.includes("bounces")) value = d.bounces ?? 0;

    points.push({ date, value });
  });

  if (points.length === 0) {
    document.querySelector(".chart-placeholder").innerHTML =
      "<p>No fall data for this selection.</p>";
    return;
  }

  // Aggregate
  const buckets = {};
  for (const p of points) {
    let key = "";

    if (grouping === "daily") {
      key = p.date.toLocaleDateString();
    } else if (grouping === "weekly") {
      const oneJan = new Date(p.date.getFullYear(), 0, 1);
      const week = Math.ceil(
        ((p.date - oneJan) / 86400000 + oneJan.getDay() + 1) / 7
      );
      key = `Week ${week}`;
    } else {
      // monthly
      key = p.date.toLocaleString("default", { month: "short" });
    }

    if (!buckets[key]) buckets[key] = [];
    buckets[key].push(p.value);
  }

  const labels = Object.keys(buckets);
  const data = labels.map((l) => buckets[l].reduce((a, b) => a + b, 0));

  await updateSummary(user);
  drawChart(labels, data, typeSelect.value);
}

// ========= SUMMARY SECTION ==========
async function updateSummary(user) {
  const ref = doc(db, "users", user.uid);
  const snap = await getDoc(ref);
  if (!snap.exists()) return;

  const stats = snap.data().stats || {};

  totalDrops.textContent = `Total Drops: ${stats.totalDrops ?? 0}`;
  totalDistance.textContent = `Total Distance: ${(stats.totalDistance ?? 0).toFixed(2)}m`;
  totalBounces.textContent = `Total Bounces: ${stats.totalBounces ?? 0}`;
}

// ========= CHART.JS ==========
function drawChart(labels, data, label) {
  const ctx = document.getElementById("fallsChart").getContext("2d");
  if (chart) chart.destroy();

  chart = new Chart(ctx, {
    type: "line",
    data: {
      labels,
      datasets: [
        {
          label,
          data,
          borderColor: "black",
          backgroundColor: "rgba(0,0,0,0.1)",
          borderWidth: 3,
          tension: 0.3
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        y: { beginAtZero: true }
      },
      plugins: { legend: { display: false } }
    }
  });
}

// ========= DROPDOWN LISTENERS ==========
[typeSelect, yearSelect, rangeSelect].forEach((sel) =>
  sel.addEventListener("change", async () => {
    const user = auth.currentUser;
    if (user) await renderChart(user);
  })
);
