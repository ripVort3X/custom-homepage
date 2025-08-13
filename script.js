/* script.js — integrates:
   - Theme + Background (auto or manual via gallery)
   - Time, Search, Weather
   - Pinned Sites (4x4 grid responsive)
   - Settings modal
   - Notes widget (draggable, autosave)
*/

const $ = (id) => document.getElementById(id);

// -------------------- CONFIG --------------------
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
const save = (k, v) => localStorage.setItem(k, JSON.stringify(v));
const load = (k, d) => {
  try {
    const v = JSON.parse(localStorage.getItem(k));
    return v ?? d;
  } catch {
    return d;
  }
};

// -------------------- Theme & Background --------------------
function setBackground(theme, name) {
  const url = `${CONFIG.backgroundsPath}/${theme}/${name}`;
  const img = new Image();
  img.onload = () => {
    document.body.style.backgroundImage = `url('${url}')`;
    const overlay = $("bgOverlay");
    if (overlay)
      overlay.style.backgroundColor =
        theme === "dark" ? "rgba(0,0,0,0.35)" : "rgba(255,255,255,0.18)";
  };
  img.src = url;
}

function setRandomBackground(theme) {
  const list = CONFIG.bg[theme] || [];
  if (!list.length) return;
  const name = list[Math.floor(Math.random() * list.length)];
  setBackground(theme, name);
}

function applyTheme(theme) {
  document.documentElement.setAttribute("data-theme", theme);
  save("homepage:theme", theme);

  const mode = load("homepage:bgMode", "auto");
  const choice = load("homepage:bgChoice", null);
  if (mode === "manual" && choice && choice.theme === theme) {
    setBackground(choice.theme, choice.name);
  } else {
    setRandomBackground(theme);
  }
}

// Toggle theme
function toggleTheme() {
  const cur = load("homepage:theme", "dark");
  applyTheme(cur === "dark" ? "light" : "dark");
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
  window.location.href = engine + encodeURIComponent(q);
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
    const pos = await new Promise((res) => {
      if (navigator.geolocation)
        navigator.geolocation.getCurrentPosition(
          (p) => res(p.coords),
          () => res(null),
          { timeout: 5000 }
        );
      else res(null);
    });
    const q = pos ? `${pos.latitude},${pos.longitude}` : "28.7041,77.1025";
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
  } catch (e) {
    wText.textContent = "Weather error";
    wIcon.src = "";
    console.warn(e);
  }
}

// -------------------- Pinned Sites --------------------
function fetchFavicon(url) {
  try {
    const u = new URL(url);
    return `https://www.google.com/s2/favicons?domain=${u.hostname}&sz=64`;
  } catch {
    return "/favicon.png";
  }
}

function loadDefaultPinsIfEmpty() {
  if (!localStorage.getItem("homepage:pins")) {
    save("homepage:pins", [
      { title: "Youtube", url: "https://youtube.com" },
      { title: "ChatGPT", url: "https://chatgpt.com/" },
      { title: "Github", url: "https://github.com" },
    ]);
  }
}

function renderPins() {
  const pins = load("homepage:pins", []);
  const grid = $("pinnedGrid");
  if (!grid) return;
  grid.innerHTML = "";

  if (!pins.length) {
    const p = document.createElement("div");
    p.className = "no-pins";
    p.textContent = "No pinned sites. Add some in Settings.";
    grid.appendChild(p);
    return;
  }

  pins.forEach((p) => {
    const el = document.createElement("div");
    el.className = "pin";
    el.tabIndex = 0;
    el.addEventListener("click", () => window.open(p.url, "_self"));
    const img = document.createElement("img");
    img.src = p.icon || fetchFavicon(p.url);
    img.onerror = () => {
      img.src = fetchFavicon(p.url);
    };
    const t = document.createElement("div");
    t.className = "title";
    t.textContent = p.title;
    el.append(img, t);
    grid.appendChild(el);
  });

  // settings list
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
      edit.className = "btn btn-sm";
      edit.textContent = "Edit";
      const del = document.createElement("button");
      del.className = "btn btn-sm";
      del.textContent = "Delete";

      edit.addEventListener("click", (ev) => {
        ev.stopPropagation();
        $("pinTitle").value = p.title || "";
        $("pinURL").value = p.url || "";
        $("pinIcon").value = p.icon || "";
        $("addPinBtn").textContent = "Update";
        $("addPinBtn").dataset.edit = idx;
      });
      del.addEventListener("click", (ev) => {
        ev.stopPropagation();
        pins.splice(idx, 1);
        save("homepage:pins", pins);
        renderPins();
      });

      actions.append(edit, del);
      item.append(img, meta, actions);
      list.appendChild(item);
    });
  }
}

// -------------------- Settings Modal --------------------
function renderBgThumbs() {
  const theme = load("homepage:theme", "dark");
  const mode = load("homepage:bgMode", "auto");
  const choice = load("homepage:bgChoice", null);

  const thumbs = $("bgThumbs");
  if (!thumbs) return;
  thumbs.innerHTML = "";

  if ($("bgMode")) $("bgMode").value = mode;

  CONFIG.bg[theme].forEach((name) => {
    const wrap = document.createElement("div");
    wrap.className = "bg-thumb";
    if (
      mode === "manual" &&
      choice &&
      choice.theme === theme &&
      choice.name === name
    ) {
      wrap.classList.add("active");
    }
    const img = document.createElement("img");
    img.src = `${CONFIG.backgroundsPath}/${theme}/${name}`;
    img.alt = name;

    wrap.addEventListener("click", () => {
      document
        .querySelectorAll(".bg-thumb.active")
        .forEach((n) => n.classList.remove("active"));
      wrap.classList.add("active");
      save("homepage:bgMode", "manual");
      save("homepage:bgChoice", { theme, name });
      if ($("bgMode")) $("bgMode").value = "manual";
      setBackground(theme, name);
    });

    wrap.appendChild(img);
    thumbs.appendChild(wrap);
  });
}

function openSettings() {
  const modal = $("modalBackdrop");
  modal.style.display = "flex";

  $("searchEngine").value = load("homepage:searchEngine", CONFIG.defaultSearch);
  $("themeSelect").value = load("homepage:theme", "dark");
  $("weatherKey").value = load("homepage:weatherKey", "");

  renderBgThumbs();
  renderPins();
}

function closeSettings() {
  $("modalBackdrop").style.display = "none";
}

function bindSettingsEvents() {
  $("closeModal").addEventListener("click", closeSettings);

  $("saveSettings").addEventListener("click", () => {
    save("homepage:searchEngine", $("searchEngine").value);
    const newTheme = $("themeSelect").value;
    save("homepage:theme", newTheme);
    save("homepage:weatherKey", $("weatherKey").value.trim());

    // bg mode dropdown (may be changed)
    const modeSel = $("bgMode");
    if (modeSel) save("homepage:bgMode", modeSel.value);

    closeSettings();
    applyTheme(newTheme);
    fetchWeather();
    renderPins();
  });

  $("bgMode").addEventListener("change", (e) => {
    const theme = load("homepage:theme", "dark");
    const mode = e.target.value;
    save("homepage:bgMode", mode);
    if (mode === "auto") setRandomBackground(theme);
  });

  // openers
  $("settingsBtn").addEventListener("click", openSettings);
  $("openSettingsSmall").addEventListener("click", openSettings);
}

// -------------------- Notes widget --------------------
function renderNotes() {
  const list = $("notesList");
  const items = load("homepage:notes", []);
  list.innerHTML = "";
  items.forEach((n, idx) => {
    const li = document.createElement("li");
    if (n.done) li.classList.add("done");

    const cb = document.createElement("input");
    cb.type = "checkbox";
    cb.checked = n.done;
    cb.addEventListener("change", () => {
      items[idx].done = cb.checked;
      save("homepage:notes", items);
      renderNotes();
    });

    const span = document.createElement("span");
    span.className = "text";
    span.textContent = n.text;

    const del = document.createElement("button");
    del.className = "btn btn-sm del";
    del.textContent = "Delete";
    del.addEventListener("click", () => {
      items.splice(idx, 1);
      save("homepage:notes", items);
      renderNotes();
    });

    li.append(cb, span, del);
    list.appendChild(li);
  });
}

function initNotes() {
  const notes = $("notes");
  const btn = $("notesBtn");
  const close = $("notesClose");
  const clear = $("notesClear");
  const form = $("notesForm");
  const input = $("notesInput");
  const header = $("notesHeader");

  // restore position
  const pos = load("homepage:notesPos", null);
  if (pos) {
    notes.style.left = pos.x + "px";
    notes.style.top = pos.y + "px";
  }

  btn.addEventListener("click", () => {
    notes.classList.toggle("hidden");
  });
  close.addEventListener("click", () => notes.classList.add("hidden"));

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const t = input.value.trim();
    if (!t) return;
    const items = load("homepage:notes", []);
    items.unshift({ text: t, done: false });
    save("homepage:notes", items);
    input.value = "";
    renderNotes();
  });

  clear.addEventListener("click", () => {
    const items = load("homepage:notes", []).filter((n) => !n.done);
    save("homepage:notes", items);
    renderNotes();
  });

  // drag
  let dragging = false,
    offsetX = 0,
    offsetY = 0;
  header.addEventListener("mousedown", (e) => {
    dragging = true;
    const r = notes.getBoundingClientRect();
    offsetX = e.clientX - r.left;
    offsetY = e.clientY - r.top;
    document.body.style.userSelect = "none";
  });
  window.addEventListener("mousemove", (e) => {
    if (!dragging) return;
    let x = e.clientX - offsetX;
    let y = e.clientY - offsetY;
    const maxX = window.innerWidth - notes.offsetWidth - 8;
    const maxY = window.innerHeight - notes.offsetHeight - 8;
    x = Math.max(8, Math.min(maxX, x));
    y = Math.max(8, Math.min(maxY, y));
    notes.style.left = x + "px";
    notes.style.top = y + "px";
  });
  window.addEventListener("mouseup", () => {
    if (!dragging) return;
    dragging = false;
    document.body.style.userSelect = "";
    const r = notes.getBoundingClientRect();
    save("homepage:notesPos", { x: r.left, y: r.top });
  });

  renderNotes();
}

// -------------------- Events --------------------
function bindGlobalEvents() {
  // search
  const sf = $("searchForm");
  sf.addEventListener("submit", (e) => {
    e.preventDefault();
    const q = $("searchInput").value.trim();
    if (q) doSearch(q);
  });
  $("searchInput").addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      const q = e.currentTarget.value.trim();
      if (q) doSearch(q);
    }
  });

  // shortcuts
  window.addEventListener("keydown", (e) => {
    if (
      e.key === "/" &&
      document.activeElement.tagName !== "INPUT" &&
      document.activeElement.tagName !== "TEXTAREA"
    ) {
      e.preventDefault();
      $("searchInput").focus();
    }
    if (e.key === "Escape") {
      $("modalBackdrop").style.display = "none";
    }
  });

  // click outside modal
  $("modalBackdrop").addEventListener("click", (ev) => {
    if (ev.target === $("modalBackdrop"))
      $("modalBackdrop").style.display = "none";
  });

  // theme toggle
  $("themeBtn").addEventListener("click", toggleTheme);

  // Add/Update pin
  $("addPinBtn").addEventListener("click", (e) => {
    e.preventDefault();
    const title = $("pinTitle").value.trim();
    const url = $("pinURL").value.trim();
    const icon = $("pinIcon").value.trim();
    if (!title || !url) return alert("Title and URL required");

    const pins = load("homepage:pins", []);
    const editing = $("addPinBtn").dataset.edit;
    if (editing != null) {
      pins[Number(editing)] = { title, url, icon };
      delete $("addPinBtn").dataset.edit;
      $("addPinBtn").textContent = "Add";
    } else {
      pins.push({ title, url, icon });
    }
    save("homepage:pins", pins);
    $("pinTitle").value = $("pinURL").value = $("pinIcon").value = "";
    renderPins();
  });
}

// -------------------- Init --------------------
(function init() {
  // theme & bg
  const theme = load("homepage:theme", "dark");
  document.documentElement.setAttribute("data-theme", theme);
  if (!localStorage.getItem("homepage:bgMode")) save("homepage:bgMode", "auto");

  // defaults & UI
  loadDefaultPinsIfEmpty();
  updateTime();
  setInterval(updateTime, 1000);
  applyTheme(theme);
  renderPins();
  fetchWeather();

  bindGlobalEvents();
  bindSettingsEvents();
  initNotes();

  // focus search on load
  window.addEventListener("load", () => $("searchInput")?.focus());
})();
