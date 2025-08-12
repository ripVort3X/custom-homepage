/* script.js — All features integrated
   - Uses folder: ./backgrounds/dark/ and ./backgrounds/light/
   - LocalStorage keys used:
     - homepage:theme
     - homepage:searchEngine
     - homepage:weatherKey
     - homepage:pins
*/

const $ = (id) => document.getElementById(id);

// -------------------- CONFIG (your file list) --------------------
const CONFIG = {
  backgroundsPath: "./backgrounds",
  bg: {
    dark: [
      "1.png",
      "10.jpg",
      "11.png",
      "12.png",
      "13.png",
      "2.jpg",
      "3.png",
      "4.jpg",
      "5.jpg",
      "6.jpg",
      "7.jpg",
      "8.png",
      "9.jpg",
    ],
    light: [
      "1.jpg",
      "10.png",
      "11.jpg",
      "12.png",
      "13.jpg",
      "2.png",
      "3.jpg",
      "4.png",
      "5.png",
      "6.png",
      "7.jpg",
      "8.png",
      "9.png",
    ],
  },
  defaultSearch: "https://www.google.com/search?q=",
};

// -------------------- Helpers --------------------
function save(key, val) {
  localStorage.setItem(key, JSON.stringify(val));
}
function load(key, fallback) {
  try {
    const v = JSON.parse(localStorage.getItem(key));
    return v === null || v === undefined ? fallback : v;
  } catch (e) {
    return fallback;
  }
}
function noop() {}

// -------------------- Theme & Background --------------------
function applyTheme(theme) {
  document.documentElement.setAttribute("data-theme", theme);
  save("homepage:theme", theme);
  setRandomBackground(theme);
}

function setRandomBackground(theme) {
  const list = CONFIG.bg[theme] || [];
  if (!list.length) {
    document.body.style.backgroundImage = "";
    $("bgOverlay") &&
      ($("bgOverlay").style.backgroundColor =
        theme === "dark" ? "rgba(0,0,0,0.35)" : "rgba(255,255,255,0.18)");
    return;
  }
  const name = list[Math.floor(Math.random() * list.length)];
  const url = `${CONFIG.backgroundsPath}/${theme}/${name}`;
  const img = new Image();
  img.onload = () => {
    // small crossfade: set inline then rely on CSS transition
    document.body.style.backgroundImage = `url('${url}')`;
    $("bgOverlay") &&
      ($("bgOverlay").style.backgroundColor =
        theme === "dark" ? "rgba(0,0,0,0.35)" : "rgba(255,255,255,0.18)");
  };
  img.onerror = () => {
    // silent fallback
    console.warn("Background load failed:", url);
  };
  img.src = url;
}

// Toggle theme helper
function toggleTheme() {
  const cur = load("homepage:theme", "dark");
  const next = cur === "dark" ? "light" : "dark";
  applyTheme(next);
}

// -------------------- Time & Date --------------------
function updateTime() {
  const d = new Date();
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  const date = d.toLocaleDateString();
  const el = $("timeDate");
  if (el) el.textContent = `${hh}:${mm} • ${date}`;
}
setInterval(updateTime, 1000);

// -------------------- Search --------------------
function doSearch(q) {
  const engine = load("homepage:searchEngine", CONFIG.defaultSearch);
  const url = engine + encodeURIComponent(q);
  window.location.href = url;
}

// -------------------- Weather (WeatherAPI.com) --------------------
async function fetchWeather() {
  const key = load("homepage:weatherKey", "");
  const wText = $("weatherText");
  const wIcon = $("weatherIcon");
  if (!wText || !wIcon) return;
  if (!key) {
    wText.textContent = "No key";
    wIcon.src = "";
    return;
  }

  try {
    // geolocation attempt
    const pos = await new Promise((res) => {
      if (navigator.geolocation)
        navigator.geolocation.getCurrentPosition(
          (p) => res(p.coords),
          () => res(null),
          { timeout: 5000 }
        );
      else res(null);
    });
    const q = pos ? `${pos.latitude},${pos.longitude}` : "28.7041,77.1025"; // fallback Delhi
    const resp = await fetch(
      `https://api.weatherapi.com/v1/current.json?key=${encodeURIComponent(
        key
      )}&q=${encodeURIComponent(q)}&aqi=no`
    );
    if (!resp.ok) throw new Error("Weather fetch failed");
    const data = await resp.json();
    const temp = Math.round(data.current.temp_c);
    const cond = data.current.condition.text;
    const iconUrl = (data.current.condition.icon || "").startsWith("//")
      ? "https:" + data.current.condition.icon
      : data.current.condition.icon;
    wText.textContent = `${temp}° • ${cond}`;
    wIcon.src = iconUrl || "";
    wIcon.alt = cond || "weather";
  } catch (err) {
    console.warn(err);
    wText.textContent = "Weather error";
    wIcon.src = "";
  }
}

// -------------------- Pinned Sites --------------------
function fetchFavicon(url) {
  try {
    const u = new URL(url);
    return `https://www.google.com/s2/favicons?domain=${u.hostname}&sz=64`;
  } catch (e) {
    return "/favicon.png";
  }
}

function loadDefaultPinsIfEmpty() {
  if (!localStorage.getItem("homepage:pins")) {
    const defaults = [
      { title: "YouTube", url: "https://www.youtube.com", icon: "" },
      { title: "GitHub", url: "https://github.com", icon: "" },
      { title: "Reddit", url: "https://reddit.com", icon: "" },
    ];
    save("homepage:pins", defaults);
  }
}

function renderPins() {
  const pins = load("homepage:pins", []);
  const grid = $("pinnedGrid");
  if (!grid) return;
  grid.innerHTML = "";
  if (!pins.length) {
    // empty state: small hint
    const p = document.createElement("div");
    p.className = "no-pins";
    p.textContent = "No pinned sites. Add some in Settings.";
    grid.appendChild(p);
    return;
  }
  pins.forEach((p, idx) => {
    const el = document.createElement("div");
    el.className = "pin";
    el.tabIndex = 0;
    el.addEventListener("click", (e) => {
      window.open(p.url, "_self");
    });
    const img = document.createElement("img");
    img.src = p.icon || fetchFavicon(p.url);
    img.onerror = () => {
      img.src = fetchFavicon(p.url);
    };
    const t = document.createElement("div");
    t.className = "title";
    t.textContent = p.title;
    el.appendChild(img);
    el.appendChild(t);
    grid.appendChild(el);
  });

  // populate settings list if modal open
  const list = $("pinList");
  if (list) {
    list.innerHTML = "";
    pins.forEach((p, idx) => {
      const item = document.createElement("div");
      item.className = "pin-item";
      const img = document.createElement("img");
      img.src = p.icon || fetchFavicon(p.url);
      const meta = document.createElement("div");
      meta.className = "meta";
      meta.innerHTML = `<div>${p.title}</div><div class="url">${p.url}</div>`;
      const actions = document.createElement("div");
      actions.className = "pin-actions";
      const edit = document.createElement("button");
      edit.className = "btn";
      edit.textContent = "Edit";
      const del = document.createElement("button");
      del.className = "btn";
      del.textContent = "Delete";

      edit.addEventListener("click", (ev) => {
        ev.stopPropagation();
        $("pinTitle").value = p.title || "";
        $("pinURL").value = p.url || "";
        $("pinIcon").value = p.icon || "";
        $("addPinBtn").textContent = "Update";
        $("addPinBtn").dataset.edit = idx;
        // scroll modal list into view
        const m = $("modalBackdrop");
        if (m) m.scrollTop = m.scrollHeight;
      });

      del.addEventListener("click", (ev) => {
        ev.stopPropagation();
        pins.splice(idx, 1);
        save("homepage:pins", pins);
        renderPins();
      });

      actions.appendChild(edit);
      actions.appendChild(del);
      item.appendChild(img);
      item.appendChild(meta);
      item.appendChild(actions);
      list.appendChild(item);
    });
  }
}

// -------------------- Settings Modal --------------------
function openSettings() {
  const modal = $("modalBackdrop");
  if (!modal) return;
  modal.style.display = "flex";
  // populate inputs
  $("searchEngine") &&
    ($("searchEngine").value = load(
      "homepage:searchEngine",
      CONFIG.defaultSearch
    ));
  $("themeSelect") && ($("themeSelect").value = load("homepage:theme", "dark"));
  $("weatherKey") && ($("weatherKey").value = load("homepage:weatherKey", ""));
  renderPins();
}

function closeSettings() {
  const modal = $("modalBackdrop");
  if (!modal) return;
  modal.style.display = "none";
}

// -------------------- Event bindings --------------------
function bindEvents() {
  // search form
  const searchForm = $("searchForm");
  if (searchForm) {
    searchForm.addEventListener("submit", (e) => {
      e.preventDefault();
      const q = $("searchInput").value.trim();
      if (q) doSearch(q);
    });
  }
  // Enter key on search input also handled but above ensures being safe
  const searchInput = $("searchInput");
  if (searchInput) {
    searchInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        const q = searchInput.value.trim();
        if (q) doSearch(q);
      }
    });
  }

  // keyboard shortcuts
  window.addEventListener("keydown", (e) => {
    if (
      e.key === "/" &&
      document.activeElement.tagName !== "INPUT" &&
      document.activeElement.tagName !== "TEXTAREA"
    ) {
      e.preventDefault();
      const si = $("searchInput");
      si && si.focus();
    }
    if (e.key === "Escape") closeSettings();
  });

  // modal click outside to close
  const modal = $("modalBackdrop");
  if (modal) {
    modal.addEventListener("click", (ev) => {
      if (ev.target === modal) closeSettings();
    });
  }

  // settings open/close triggers (handles presence/absence)
  const settingsBtn = $("settingsBtn");
  if (settingsBtn) settingsBtn.addEventListener("click", openSettings);
  const openSettingsSmall = $("openSettingsSmall");
  if (openSettingsSmall)
    openSettingsSmall.addEventListener("click", openSettings);
  const closeBtn = $("closeModal");
  if (closeBtn) closeBtn.addEventListener("click", closeSettings);

  // save settings
  const saveBtn = $("saveSettings");
  if (saveBtn) {
    saveBtn.addEventListener("click", () => {
      const se = $("searchEngine")
        ? $("searchEngine").value
        : CONFIG.defaultSearch;
      save("homepage:searchEngine", se);
      const theme = $("themeSelect")
        ? $("themeSelect").value
        : load("homepage:theme", "dark");
      save("homepage:theme", theme);
      const wk = $("weatherKey") ? $("weatherKey").value.trim() : "";
      save("homepage:weatherKey", wk);
      closeSettings();
      applyTheme(theme);
      fetchWeather();
    });
  }

  // theme toggle button (topbar)
  const themeBtn = $("themeBtn");
  if (themeBtn)
    themeBtn.addEventListener("click", () => {
      toggleTheme();
    });

  // add/update pin button
  const addPinBtn = $("addPinBtn");
  if (addPinBtn) {
    addPinBtn.addEventListener("click", (e) => {
      e.preventDefault();
      const title = ($("pinTitle") && $("pinTitle").value.trim()) || "";
      const url = ($("pinURL") && $("pinURL").value.trim()) || "";
      const icon = ($("pinIcon") && $("pinIcon").value.trim()) || "";
      if (!title || !url) {
        alert("Title and URL required");
        return;
      }
      const pins = load("homepage:pins", []);
      if (addPinBtn.dataset.edit != null) {
        const idx = Number(addPinBtn.dataset.edit);
        pins[idx] = { title, url, icon };
        delete addPinBtn.dataset.edit;
        addPinBtn.textContent = "Add";
      } else {
        pins.push({ title, url, icon });
      }
      save("homepage:pins", pins);
      if ($("pinTitle")) $("pinTitle").value = "";
      if ($("pinURL")) $("pinURL").value = "";
      if ($("pinIcon")) $("pinIcon").value = "";
      renderPins();
    });
  }
}

// -------------------- Init --------------------
(function init() {
  // apply saved theme or default
  const theme = load("homepage:theme", "dark");
  document.documentElement.setAttribute("data-theme", theme);

  // ensure pins exist
  loadDefaultPinsIfEmpty();

  // initial rendering
  updateTime(); // immediate
  setInterval(updateTime, 1000);
  applyTheme(theme); // sets background as well
  renderPins();
  fetchWeather();

  // bind UI events
  bindEvents();

  // focus search on load if present
  window.addEventListener("load", () => {
    const si = $("searchInput");
    si && si.focus();
  });
})();
