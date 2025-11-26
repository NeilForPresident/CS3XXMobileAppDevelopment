// Apply saved theme on load
export function applyDarkMode() {
  const enabled = localStorage.getItem("darkMode") === "true";
  if (enabled) {
    document.body.classList.add("dark-mode");
  }

  const toggle = document.getElementById("darkModeToggle");
  if (toggle) toggle.checked = enabled;
}

// Setup toggle (Settings page only)
export function setupDarkToggle() {
  const toggle = document.getElementById("darkModeToggle");
  if (!toggle) return;

  toggle.addEventListener("change", () => {
    if (toggle.checked) {
      document.body.classList.add("dark-mode");
      localStorage.setItem("darkMode", "true");
    } else {
      document.body.classList.remove("dark-mode");
      localStorage.setItem("darkMode", "false");
    }
  });
}
