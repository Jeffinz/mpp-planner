import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import {
  getFirestore,
  collection,
  doc,
  setDoc,
  deleteDoc,
  onSnapshot,
  getDocs,
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { firebaseConfig } from "./firebase-config.js";

const db = getFirestore(initializeApp(firebaseConfig));

const MONTHS = [
  "มกราคม",
  "กุมภาพันธ์",
  "มีนาคม",
  "เมษายน",
  "พฤษภาคม",
  "มิถุนายน",
  "กรกฎาคม",
  "สิงหาคม",
  "กันยายน",
  "ตุลาคม",
  "พฤศจิกายน",
  "ธันวาคม",
];

const SLOTS = {
  MORNING: { label: "เช้า", start: "08:30", end: "12:00", cls: "morning" },
  AFTERNOON: { label: "บ่าย", start: "13:00", end: "16:30", cls: "afternoon" },
  FULL_DAY: { label: "ทั้งวัน", start: "08:30", end: "16:30", cls: "full" },
};

const today = new Date();
const state = {
  year: today.getFullYear(),
  month: today.getMonth(), // 0-based
  tasks: [],
  holidays: new Set(), // weekday holidays; doc id = "YYYY-MM-DD"
  workdays: new Set(), // weekend days the user has marked as working days
};

// ---------- helpers ----------

const $ = (id) => document.getElementById(id);
const pad = (n) => String(n).padStart(2, "0");
const ymd = (y, m, d) => `${y}-${pad(m + 1)}-${pad(d)}`;
const monthPrefix = () => `${state.year}-${pad(state.month + 1)}`;
// Thai time notation: 08:30 -> "08.30 น."
const thaiTime = (hhmm) => `${hhmm.replace(":", ".")} น.`;
const thaiTimeRange = (task) =>
  `${thaiTime(task.timeStart)} – ${thaiTime(task.timeEnd)}`;
const thaiDate = (iso) => {
  const [y, m, d] = iso.split("-").map(Number);
  return `${d} ${MONTHS[m - 1]} ${y + 543}`;
};

// Builds DOM nodes with textContent, so user-entered text is never parsed as HTML.
function el(tag, props = {}, ...children) {
  const node = document.createElement(tag);
  for (const [key, value] of Object.entries(props)) {
    if (value === undefined || value === null || value === false) continue;
    if (key === "class") node.className = value;
    else if (key.startsWith("on")) node.addEventListener(key.slice(2), value);
    else node.setAttribute(key, value === true ? "" : value);
  }
  node.append(
    ...children
      .flat()
      .filter((c) => c !== null && c !== undefined && c !== false),
  );
  return node;
}

function isWeekend(iso) {
  const [y, m, d] = iso.split("-").map(Number);
  const weekday = new Date(y, m - 1, d).getDay();
  return weekday === 0 || weekday === 6;
}

// A day is a rest day if it is a holiday, or a weekend the user has not marked as a working day.
function isRest(iso) {
  if (state.holidays.has(iso)) return true;
  return isWeekend(iso) && !state.workdays.has(iso);
}

// Returns the reason a task with this slot cannot be placed on this date, or null if it can.
function addBlockReason(iso, slot, excludeId) {
  if (isRest(iso))
    return "วันนี้เป็นวันหยุด ต้องยกเลิกวันหยุดก่อนจึงจะเพิ่มงานได้";
  const others = tasksOn(iso).filter((t) => t.id !== excludeId);
  if (others.some((t) => t.slot === "FULL_DAY")) {
    return "วันนี้มีงานทั้งวันแล้ว ต้องลบงานทั้งวันก่อนจึงจะเพิ่มงานได้";
  }
  if (slot === "FULL_DAY" && others.length > 0) {
    return "วันนี้มีงานช่วงเช้าหรือบ่ายอยู่แล้ว ต้องลบงานเหล่านั้นก่อนจึงจะเพิ่มงานทั้งวันได้";
  }
  return null;
}

function tasksOn(iso) {
  return state.tasks
    .filter((t) => t.date === iso)
    .sort((a, b) => a.timeStart.localeCompare(b.timeStart));
}

function showModal(id, open) {
  $(id).hidden = !open;
}

let toastTimer;
function toast(message, kind = "ok") {
  const node = $("toast");
  $("toast-msg").textContent = message;
  node.className = `toast show ${kind}`;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => node.classList.remove("show"), 3000);
}

// Runs a Firestore write and reports failure to the user instead of failing silently.
async function persist(action, successMessage, onDone) {
  try {
    await action();
    onDone?.();
    toast(successMessage);
  } catch (err) {
    console.error(err);
    toast("บันทึกไม่สำเร็จ โปรดตรวจสอบการเชื่อมต่อแล้วลองอีกครั้ง", "error");
  }
}

// ---------- rendering ----------

function render() {
  renderGrid();
  renderList();
  if (!$("holiday-modal").hidden) renderHolidayList();
}

function renderGrid() {
  const grid = $("grid");
  grid.replaceChildren();

  const days = new Date(state.year, state.month + 1, 0).getDate();
  const lead = new Date(state.year, state.month, 1).getDay();
  for (let i = 0; i < lead; i++) grid.append(el("div", { class: "cell pad" }));

  for (let d = 1; d <= days; d++) {
    const iso = ymd(state.year, state.month, d);
    const rest = isRest(iso);
    const items = tasksOn(iso);
    const bySlot = (slot) => items.filter((t) => t.slot === slot);
    const full = bySlot("FULL_DAY");
    const morning = bySlot("MORNING");
    const afternoon = bySlot("AFTERNOON");
    const dayHasFullDay = full.length > 0;

    grid.append(
      el(
        "div",
        { class: rest ? "cell rest" : "cell" },
        el(
          "button",
          {
            type: "button",
            class: "daynum",
            title: dayToggleLabel(iso),
            onclick: () => toggleRest(iso),
          },
          String(d),
        ),
        rest && items.length === 0
          ? el("span", { class: "rest-note" }, "วันหยุดพักผ่อน")
          : null,
        el(
          "div",
          { class: "items" },
          ...full.map(badge),
          ...slotBlock(
            iso,
            "MORNING",
            morning,
            rest || dayHasFullDay,
            "+ เช้าว่าง",
          ),
          ...slotBlock(
            iso,
            "AFTERNOON",
            afternoon,
            rest || dayHasFullDay,
            "+ บ่ายว่าง",
          ),
        ),
      ),
    );
  }
}

function dayToggleLabel(iso) {
  if (state.holidays.has(iso)) return "ยกเลิกวันหยุด";
  if (isWeekend(iso))
    return state.workdays.has(iso) ? "ตั้งเป็นวันหยุด" : "ตั้งเป็นวันทำงาน";
  return "ตั้งเป็นวันหยุด";
}

function badge(task) {
  const slot = SLOTS[task.slot] ?? SLOTS.MORNING;
  return el(
    "button",
    {
      type: "button",
      class: `badge ${slot.cls}`,
      title: task.project,
      onclick: () => openTaskModal(task.id),
    },
    el("span", { class: "time" }, thaiTimeRange(task)),
    el("span", { class: "proj" }, task.project),
  );
}

// Each slot keeps a fixed position in the cell: tasks of that slot, or a placeholder when empty.
function slotBlock(iso, slot, items, hidePlaceholder, placeholderText) {
  if (items.length > 0) return items.map(badge);
  return hidePlaceholder ? [] : [slotAdd(iso, slot, placeholderText)];
}

function slotAdd(iso, slot, text) {
  return el(
    "button",
    {
      type: "button",
      class: "slot-add",
      onclick: () => openTaskModal(null, iso, slot),
    },
    text,
  );
}

function renderList() {
  const list = $("list");
  list.replaceChildren();

  const days = new Date(state.year, state.month + 1, 0).getDate();
  for (let d = 1; d <= days; d++) {
    const iso = ymd(state.year, state.month, d);
    const items = tasksOn(iso);

    if (items.length > 0) {
      items.forEach((task) => list.append(listRow(iso, task)));
    } else if (state.holidays.has(iso)) {
      list.append(
        el(
          "button",
          {
            type: "button",
            class: "row rest-row",
            onclick: () => toggleRest(iso),
          },
          el("span", {}, `${thaiDate(iso)} · วันหยุด`),
          el("span", { class: "accent" }, "เปลี่ยนสถานะ"),
        ),
      );
    } else if (isRest(iso)) {
      list.append(
        el(
          "div",
          { class: "row rest-row static" },
          el("span", {}, `${thaiDate(iso)} · วันหยุดสุดสัปดาห์`),
        ),
      );
    } else {
      list.append(
        el(
          "button",
          {
            type: "button",
            class: "row empty",
            onclick: () => openTaskModal(null, iso),
          },
          el("span", {}, `${thaiDate(iso)} · ว่าง`),
          el("span", { class: "accent" }, "+ เพิ่มงาน"),
        ),
      );
    }
  }
}

function listRow(iso, task) {
  const slot = SLOTS[task.slot] ?? SLOTS.MORNING;
  return el(
    "button",
    {
      type: "button",
      class: `row ${slot.cls}`,
      onclick: () => openTaskModal(task.id),
    },
    el(
      "div",
      {},
      el(
        "small",
        {},
        `${thaiDate(iso)} · ${slot.label} · ${thaiTimeRange(task)}`,
      ),
      el("strong", {}, task.project),
    ),
  );
}

function populateYears() {
  const select = $("select-year");
  select.replaceChildren();
  for (let y = 2025; y <= 2030; y++) {
    select.append(el("option", { value: y }, String(y + 543)));
  }
}

function syncMonthControls() {
  $("select-month").value = state.month;
  $("select-year").value = state.year;
}

function shiftMonth(delta) {
  const next = new Date(state.year, state.month + delta, 1);
  state.year = next.getFullYear();
  state.month = next.getMonth();
  syncMonthControls();
  render();
}

// ---------- task modal ----------

function applySlotTimes() {
  const slot = SLOTS[$("task-slot").value];
  if (!slot) return;
  $("task-time-start").value = slot.start;
  $("task-time-end").value = slot.end;
}

function openTaskModal(taskId = null, date = null, slot = "MORNING") {
  const form = $("task-form");
  form.reset();
  $("btn-delete").hidden = true;

  if (taskId) {
    const task = state.tasks.find((t) => t.id === taskId);
    if (!task) return;
    $("modal-title").textContent = "แก้ไขข้อมูลงาน";
    $("task-id").value = task.id;
    $("task-date").value = task.date;
    $("task-slot").value = task.slot;
    $("task-time-start").value = task.timeStart;
    $("task-time-end").value = task.timeEnd;
    $("task-project").value = task.project;
    $("btn-delete").hidden = false;
  } else {
    $("modal-title").textContent = "เพิ่มงานใหม่";
    $("task-date").value = date ?? ymd(state.year, state.month, 1);
    $("task-slot").value = slot;
    applySlotTimes();
  }
  showModal("task-modal", true);
  $("task-project").focus();
}

async function saveTask(event) {
  event.preventDefault();
  const project = $("task-project").value.trim();
  const timeStart = $("task-time-start").value;
  const timeEnd = $("task-time-end").value;

  if (!project) {
    $("task-project").focus();
    return;
  }
  if (timeEnd <= timeStart) {
    toast("เวลาจบต้องอยู่หลังเวลาเริ่ม", "error");
    return;
  }

  const id = $("task-id").value || String(Date.now());
  const date = $("task-date").value;
  const slot = $("task-slot").value;
  const existing = state.tasks.find((t) => t.id === id);

  // Day rules apply when the task is new, or its date or slot changes.
  if (!existing || existing.date !== date || existing.slot !== slot) {
    const reason = addBlockReason(date, slot, id);
    if (reason) {
      toast(reason, "error");
      return;
    }
  }

  const data = {
    id,
    date,
    slot,
    timeStart,
    timeEnd,
    project,
  };
  await persist(
    () => setDoc(doc(db, "tasks", id), data),
    "บันทึกข้อมูลสำเร็จ",
    () => showModal("task-modal", false),
  );
}

async function deleteTask() {
  const id = $("task-id").value;
  if (!id || !confirm("คุณต้องการลบงานนี้ใช่หรือไม่?")) return;
  await persist(
    () => deleteDoc(doc(db, "tasks", id)),
    "ลบงานเรียบร้อยแล้ว",
    () => showModal("task-modal", false),
  );
}

// ---------- rest days (holidays and weekend workdays) ----------

// Day-number click and mobile row click both come here.
// Weekday: toggles holiday. Weekend: toggles working-day override.
async function toggleRest(iso) {
  if (state.holidays.has(iso)) {
    return removeHoliday(iso);
  }
  if (isWeekend(iso)) {
    if (state.workdays.has(iso)) {
      return persist(
        () => deleteDoc(doc(db, "workdays", iso)),
        `ตั้ง ${thaiDate(iso)} เป็นวันหยุดแล้ว`,
      );
    }
    return persist(
      () => setDoc(doc(db, "workdays", iso), { date: iso }),
      `ตั้ง ${thaiDate(iso)} เป็นวันทำงานแล้ว`,
    );
  }
  return persist(
    () => setDoc(doc(db, "holidays", iso), { date: iso }),
    `ตั้ง ${thaiDate(iso)} เป็นวันหยุดแล้ว`,
  );
}

async function removeHoliday(iso) {
  if (!confirm(`ยกเลิกวันหยุด ${thaiDate(iso)} ใช่หรือไม่?`)) return;
  await persist(() => deleteDoc(doc(db, "holidays", iso)), "ยกเลิกวันหยุดแล้ว");
}

function openHolidayModal() {
  $("holiday-picker").value = ymd(state.year, state.month, 1);
  renderHolidayList();
  showModal("holiday-modal", true);
}

async function addHolidayFromPicker() {
  const iso = $("holiday-picker").value;
  if (!iso) {
    toast("กรุณาเลือกวันที่ก่อนบันทึก", "error");
    return;
  }
  if (isWeekend(iso)) {
    if (!state.workdays.has(iso)) {
      toast("วันนี้เป็นวันหยุดสุดสัปดาห์อยู่แล้ว", "error");
      return;
    }
    // Weekend day was marked as a working day; removing that mark restores it as rest.
    await persist(
      () => deleteDoc(doc(db, "workdays", iso)),
      `ตั้ง ${thaiDate(iso)} เป็นวันหยุดแล้ว`,
    );
    return;
  }
  if (state.holidays.has(iso)) {
    toast("วันที่นี้เป็นวันหยุดอยู่แล้ว", "error");
    return;
  }
  await persist(
    () => setDoc(doc(db, "holidays", iso), { date: iso }),
    "บันทึกวันหยุดแล้ว",
  );
}

function renderHolidayList() {
  const box = $("holiday-list");
  box.replaceChildren();
  const prefix = monthPrefix();
  const monthHolidays = [...state.holidays]
    .filter((h) => h.startsWith(prefix))
    .sort();

  if (monthHolidays.length === 0) {
    box.append(el("p", { class: "muted" }, "ยังไม่มีวันหยุดในเดือนนี้"));
    return;
  }
  monthHolidays.forEach((iso) => {
    box.append(
      el(
        "div",
        { class: "hol-row" },
        el("span", {}, thaiDate(iso)),
        el(
          "button",
          {
            type: "button",
            class: "text-btn danger-text",
            onclick: () => removeHoliday(iso),
          },
          "ลบ",
        ),
      ),
    );
  });
}

// ---------- settings ----------

async function clearAllTasks() {
  if (!confirm("ต้องการลบงานทั้งหมดบน Cloud ใช่หรือไม่?")) return;
  await persist(
    async () => {
      const snapshot = await getDocs(collection(db, "tasks"));
      await Promise.all(snapshot.docs.map((d) => deleteDoc(d.ref)));
    },
    "ลบงานทั้งหมดแล้ว",
    () => showModal("settings-modal", false),
  );
}

// ---------- wiring ----------

function bindEvents() {
  $("btn-prev").addEventListener("click", () => shiftMonth(-1));
  $("btn-next").addEventListener("click", () => shiftMonth(1));
  $("select-month").addEventListener("change", (e) => {
    state.month = Number(e.target.value);
    render();
  });
  $("select-year").addEventListener("change", (e) => {
    state.year = Number(e.target.value);
    render();
  });

  $("btn-new").addEventListener("click", () => openTaskModal());
  $("task-form").addEventListener("submit", saveTask);
  $("task-slot").addEventListener("change", applySlotTimes);
  $("btn-delete").addEventListener("click", deleteTask);
  $("btn-cancel").addEventListener("click", () =>
    showModal("task-modal", false),
  );
  $("btn-close-task").addEventListener("click", () =>
    showModal("task-modal", false),
  );

  $("btn-holidays").addEventListener("click", openHolidayModal);
  $("holiday-add").addEventListener("click", addHolidayFromPicker);
  $("holiday-close").addEventListener("click", () =>
    showModal("holiday-modal", false),
  );

  $("btn-settings").addEventListener("click", () =>
    showModal("settings-modal", true),
  );
  $("settings-close").addEventListener("click", () =>
    showModal("settings-modal", false),
  );
  $("btn-clear-all").addEventListener("click", clearAllTasks);

  document.querySelectorAll(".modal").forEach((modal) => {
    modal.addEventListener("click", (e) => {
      if (e.target === modal) modal.hidden = true;
    });
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape")
      document.querySelectorAll(".modal").forEach((m) => (m.hidden = true));
  });
}

function startRealtimeSync() {
  const onError = (err) => {
    console.error(err);
    toast("โหลดข้อมูลจาก Cloud ไม่สำเร็จ", "error");
  };
  onSnapshot(
    collection(db, "tasks"),
    (snapshot) => {
      state.tasks = snapshot.docs.map((d) => d.data());
      render();
    },
    onError,
  );
  onSnapshot(
    collection(db, "holidays"),
    (snapshot) => {
      state.holidays = new Set(snapshot.docs.map((d) => d.id));
      render();
    },
    onError,
  );
  onSnapshot(
    collection(db, "workdays"),
    (snapshot) => {
      state.workdays = new Set(snapshot.docs.map((d) => d.id));
      render();
    },
    onError,
  );
}

populateYears();
syncMonthControls();
bindEvents();
render();
startRealtimeSync();
