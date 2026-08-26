import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import {
  getFirestore,
  collection,
  doc,
  setDoc,
  deleteDoc,
  onSnapshot,
  query,
  where,
  getDocs,
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

// ⚠️ วาง firebaseConfig ของคุณตรงนี้
const firebaseConfig = {
  apiKey: "AIzaSyDRaSrfpxCwBMHAFlqoCJBvzw5paakUQcI",
  authDomain: "mpp-planner.firebaseapp.com",
  projectId: "mpp-planner",
  storageBucket: "mpp-planner.firebasestorage.app",
  messagingSenderId: "413077415177",
  appId: "1:413077415177:web:26b2bb1aa1926ec3031fd8",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const monthNamesThai = [
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
const dayNamesThaiShort = ["อา.", "จ.", "อ.", "พ.", "พฤ.", "ศ.", "ส."];

const today = new Date();
let currentYear = today.getFullYear();
let currentMonth = today.getMonth();

let tasks = [];
let holidays = [];
let tempImages = [];

window.addEventListener("load", () => {
  document.getElementById("select-month").value = currentMonth;
  document.getElementById("select-year").value = currentYear;

  // Bind functions to window context
  window.switchTab = switchTab;
  window.switchFormTab = switchFormTab;
  window.onMonthYearChange = onMonthYearChange;
  window.changeMonth = changeMonth;
  window.openTaskModal = openTaskModal;
  window.closeTaskModal = closeTaskModal;
  window.saveTask = saveTask;
  window.deleteTask = deleteTask;
  window.toggleMissionFields = toggleMissionFields;
  window.updateTimeInputs = updateTimeInputs;
  window.handleImageUpload = handleImageUpload;
  window.removeTempImage = removeTempImage;
  window.openSettingsModal = openSettingsModal;
  window.closeSettingsModal = closeSettingsModal;
  window.clearOldFiscalYearData = clearOldFiscalYearData;
  window.clearAllCloudData = clearAllCloudData;
  window.openHolidayModal = openHolidayModal;
  window.closeHolidayModal = closeHolidayModal;
  window.addHolidayFromPicker = addHolidayFromPicker;
  window.removeHoliday = removeHoliday;
  window.copyField = copyField;
  window.toggleTaskAccordion = toggleTaskAccordion;

  lucide.createIcons();

  // Realtime Sync
  onSnapshot(collection(db, "tasks"), (snapshot) => {
    tasks = [];
    snapshot.forEach((docSnap) => tasks.push(docSnap.data()));
    renderCalendar();
    if (
      !document.getElementById("tab-readiness").classList.contains("hidden")
    ) {
      renderReadinessList();
    }
  });

  onSnapshot(collection(db, "holidays"), (snapshot) => {
    holidays = [];
    snapshot.forEach((docSnap) => holidays.push(docSnap.data().date));
    renderCalendar();
  });
});

function formatThaiDate(dateStr) {
  if (!dateStr) return "";
  const parts = dateStr.split("-");
  if (parts.length !== 3) return dateStr;
  const yearBE = parseInt(parts[0]) + 543;
  const monthText = monthNamesThai[parseInt(parts[1]) - 1];
  const dayNum = parseInt(parts[2]);
  return `${dayNum} ${monthText} ${yearBE}`;
}

function switchFormTab(tab) {
  const secDetails = document.getElementById("form-sec-details");
  const secMedia = document.getElementById("form-sec-media");
  const btnDetails = document.getElementById("form-tab-btn-details");
  const btnMedia = document.getElementById("form-tab-btn-media");

  if (tab === "details") {
    secDetails.classList.remove("hidden");
    secMedia.classList.add("hidden");
    btnDetails.className =
      "flex-1 py-2.5 border-b-2 border-blue-600 text-blue-600 bg-white font-bold";
    btnMedia.className =
      "flex-1 py-2.5 border-b-2 border-transparent text-slate-500 hover:text-slate-800 font-semibold";
  } else {
    secDetails.classList.add("hidden");
    secMedia.classList.remove("hidden");
    btnMedia.className =
      "flex-1 py-2.5 border-b-2 border-blue-600 text-blue-600 bg-white font-bold";
    btnDetails.className =
      "flex-1 py-2.5 border-b-2 border-transparent text-slate-500 hover:text-slate-800 font-semibold";
  }
}

async function saveTaskToCloud(taskData) {
  await setDoc(doc(db, "tasks", taskData.id), taskData);
}

async function deleteTaskFromCloud(id) {
  await deleteDoc(doc(db, "tasks", id));
}

async function saveHolidayToCloud(dateStr) {
  await setDoc(doc(db, "holidays", dateStr), { date: dateStr });
}

async function deleteHolidayFromCloud(dateStr) {
  await deleteDoc(doc(db, "holidays", dateStr));
}

function openSettingsModal() {
  document.getElementById("settings-modal").classList.remove("hidden");
}
function closeSettingsModal() {
  document.getElementById("settings-modal").classList.add("hidden");
}

async function clearOldFiscalYearData(yearBE) {
  if (confirm(`ลบข้อมูลปีงบประมาณ ${yearBE} ออกจาก Cloud ใช่หรือไม่?`)) {
    const q = query(collection(db, "tasks"), where("fiscalYear", "==", yearBE));
    const querySnapshot = await getDocs(q);
    querySnapshot.forEach(async (docSnap) => {
      await deleteDoc(doc(db, "tasks", docSnap.id));
    });
    closeSettingsModal();
    showToast(`ลบข้อมูลปี ${yearBE} เรียบร้อยแล้ว`);
  }
}

async function clearAllCloudData() {
  if (confirm("⚠️ ต้องการล้างข้อมูลทั้งหมดบน Cloud ใช่หรือไม่?")) {
    const querySnapshot = await getDocs(collection(db, "tasks"));
    querySnapshot.forEach(async (docSnap) => {
      await deleteDoc(doc(db, "tasks", docSnap.id));
    });
    closeSettingsModal();
    showToast("ล้างข้อมูลเรียบร้อยแล้ว");
  }
}

function handleImageUpload(e) {
  const files = Array.from(e.target.files);
  if (tempImages.length + files.length > 2) {
    alert("แนบรูปภาพได้สูงสุดเพียง 2 รูปเท่านั้น");
    return;
  }

  files.forEach((file) => {
    const reader = new FileReader();
    reader.onload = function (event) {
      const img = new Image();
      img.onload = function () {
        const canvas = document.createElement("canvas");
        let width = img.width;
        let height = img.height;
        const maxDimension = 1920;

        if (width > height) {
          if (width > maxDimension) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          }
        } else {
          if (height > maxDimension) {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, width, height);

        const compressedBase64 = canvas.toDataURL("image/jpeg", 0.7);
        tempImages.push(compressedBase64);
        renderImagePreviews();
      };
      img.src = event.target.result;
    };
    reader.readAsDataURL(file);
  });
  e.target.value = "";
}

function renderImagePreviews() {
  const container = document.getElementById("image-preview-container");
  container.innerHTML = "";
  tempImages.forEach((imgBase64, index) => {
    container.innerHTML += `
            <div class="relative group border rounded-2xl overflow-hidden bg-slate-100 aspect-video flex items-center justify-center">
                <img src="${imgBase64}" class="object-cover w-full h-full">
                <button type="button" onclick="removeTempImage(${index})" class="absolute top-1.5 right-1.5 bg-red-600 text-white rounded-full p-1 shadow hover:bg-red-700 transition">
                    <i data-lucide="x" class="w-3.5 h-3.5"></i>
                </button>
            </div>
        `;
  });
  lucide.createIcons();
}

function removeTempImage(index) {
  tempImages.splice(index, 1);
  renderImagePreviews();
}

function showToast(msg) {
  const toast = document.getElementById("toast");
  document.getElementById("toast-message").innerText = msg;
  toast.classList.remove("opacity-0", "pointer-events-none");
  setTimeout(() => {
    toast.classList.add("opacity-0", "pointer-events-none");
  }, 2000);
}

function copyField(text, fieldName) {
  if (!text) return alert(`ไม่มีข้อมูลในช่อง ${fieldName}`);
  navigator.clipboard.writeText(text).then(() => {
    showToast(`คัดลอก "${fieldName}" แล้ว`);
  });
}

function onMonthYearChange() {
  currentMonth = parseInt(document.getElementById("select-month").value);
  currentYear = parseInt(document.getElementById("select-year").value);
  renderCalendar();
}

function changeMonth(delta) {
  currentMonth += delta;
  if (currentMonth > 11) {
    currentMonth = 0;
    currentYear++;
  } else if (currentMonth < 0) {
    currentMonth = 11;
    currentYear--;
  }

  if (currentYear < 2026) currentYear = 2026;
  if (currentYear > 2027) currentYear = 2027;

  document.getElementById("select-month").value = currentMonth;
  document.getElementById("select-year").value = currentYear;
  renderCalendar();
}

function switchTab(tab) {
  document
    .querySelectorAll(".nav-tab")
    .forEach((btn) => btn.classList.remove("active-tab", "text-slate-900"));
  if (tab === "dashboard") {
    document.getElementById("tab-dashboard").classList.remove("hidden");
    document.getElementById("tab-readiness").classList.add("hidden");
    document.getElementById("btn-dashboard").classList.add("active-tab");
    renderCalendar();
  } else {
    document.getElementById("tab-dashboard").classList.add("hidden");
    document.getElementById("tab-readiness").classList.remove("hidden");
    document.getElementById("btn-readiness").classList.add("active-tab");
    renderReadinessList();
  }
}

function toggleMissionFields() {
  const type = document.getElementById("task-mission-type").value;
  const objectiveContainer = document.getElementById(
    "field-objective-container",
  );
  const missionContainer = document.getElementById("field-mission-container");

  if (type === "SELF_DEV") {
    objectiveContainer.classList.add("hidden");
    missionContainer.classList.add("hidden");
    document.getElementById("lbl-project").innerText = "ชื่อหลักสูตร/กิจกรรม *";
  } else if (type === "MISSION_5") {
    objectiveContainer.classList.remove("hidden");
    missionContainer.classList.add("hidden");
    document.getElementById("lbl-project").innerText = "ชื่อกิจกรรม *";
    document.getElementById("lbl-objective").innerText =
      "วัตถุประสงค์กิจกรรม *";
  } else {
    objectiveContainer.classList.remove("hidden");
    missionContainer.classList.remove("hidden");
    document.getElementById("lbl-project").innerText = "ชื่อโครงการ/กิจกรรม *";
    document.getElementById("lbl-objective").innerText =
      "วัตถุประสงค์โครงการ *";
  }
}

function updateTimeInputs() {
  const slot = document.getElementById("task-slot").value;
  if (slot === "MORNING") {
    document.getElementById("task-time-start").value = "08:30";
    document.getElementById("task-time-end").value = "12:00";
  } else if (slot === "AFTERNOON") {
    document.getElementById("task-time-start").value = "13:00";
    document.getElementById("task-time-end").value = "16:30";
  } else {
    document.getElementById("task-time-start").value = "08:30";
    document.getElementById("task-time-end").value = "16:30";
  }
}

function renderCalendar() {
  const gridDesktop = document.getElementById("calendar-grid-desktop");
  const listMobile = document.getElementById("calendar-list-mobile");
  const mobileMonthLabel = document.getElementById("mobile-month-label");

  gridDesktop.innerHTML = "";
  listMobile.innerHTML = "";
  if (mobileMonthLabel)
    mobileMonthLabel.innerText = `${monthNamesThai[currentMonth]} ${currentYear + 543}`;

  const firstDay = new Date(currentYear, currentMonth, 1);
  const startDayOffset = firstDay.getDay();
  const totalDays = new Date(currentYear, currentMonth + 1, 0).getDate();

  for (let i = 0; i < startDayOffset; i++) {
    gridDesktop.innerHTML += `<div class="bg-slate-50/50 min-h-[110px]"></div>`;
  }

  let weekendCount = 0;

  for (let day = 1; day <= totalDays; day++) {
    const dateObj = new Date(currentYear, currentMonth, day);
    const dayOfWeek = dateObj.getDay();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

    const monthStr = (currentMonth + 1).toString().padStart(2, "0");
    const dayStr = day.toString().padStart(2, "0");
    const dateStr = `${currentYear}-${monthStr}-${dayStr}`;

    const isStatutoryHoliday = holidays.includes(dateStr);
    if (isWeekend || isStatutoryHoliday) weekendCount++;

    const dayTasks = tasks.filter(
      (t) =>
        t.date === dateStr ||
        (t.dateStart && t.dateStart <= dateStr && t.dateEnd >= dateStr),
    );
    const morningTasks = dayTasks.filter(
      (t) => t.slot === "MORNING" || t.slot === "FULL_DAY",
    );
    const afternoonTasks = dayTasks.filter(
      (t) => t.slot === "AFTERNOON" || t.slot === "FULL_DAY",
    );

    let desktopHtml = `
            <div class="bg-white p-2 border border-slate-100 min-h-[120px] flex flex-col justify-between ${isWeekend || isStatutoryHoliday ? "bg-slate-50/80" : ""}">
                <div class="flex justify-between items-center mb-1">
                    <span class="text-xs font-bold ${isWeekend || isStatutoryHoliday ? "text-red-500" : "text-slate-700"}">${day}</span>
                    ${isStatutoryHoliday ? `<button onclick="removeHoliday('${dateStr}')" class="text-[9px] bg-red-50 text-red-600 px-1.5 py-0.5 rounded-full font-semibold">หยุด ✕</button>` : ""}
                </div>
        `;

    if ((isWeekend || isStatutoryHoliday) && dayTasks.length === 0) {
      desktopHtml += `
                <div onclick="openTaskModal(null, '${dateStr}', 'MORNING')" class="flex-1 bg-slate-100/60 rounded-xl flex items-center justify-center text-[11px] text-slate-400 cursor-pointer hover:bg-slate-200/50 transition">
                    🛑 วันหยุด
                </div>
            `;
    } else {
      desktopHtml += `<div class="space-y-1 flex-1 flex flex-col">`;
      if (morningTasks.length > 0) {
        desktopHtml += renderDesktopTaskBadge(morningTasks[0], "เช้า");
      } else {
        desktopHtml += renderDesktopEmptySlot(dateStr, "MORNING", "เช้า");
      }

      if (morningTasks.length > 0 && morningTasks[0].slot === "FULL_DAY") {
        // Covered
      } else if (afternoonTasks.length > 0) {
        desktopHtml += renderDesktopTaskBadge(afternoonTasks[0], "บ่าย");
      } else {
        desktopHtml += renderDesktopEmptySlot(dateStr, "AFTERNOON", "บ่าย");
      }
      desktopHtml += `</div>`;
    }
    desktopHtml += `</div>`;
    gridDesktop.innerHTML += desktopHtml;

    let mobileCardHtml = `
            <div class="p-3 rounded-2xl border ${isWeekend || isStatutoryHoliday ? "bg-slate-50 border-slate-200" : "bg-white border-slate-200"} space-y-2">
                <div class="flex justify-between items-center pb-1.5 border-b border-slate-100">
                    <span class="font-bold text-xs ${isWeekend || isStatutoryHoliday ? "text-red-600" : "text-slate-800"}">${day} ${monthNamesThai[currentMonth]} (${dayNamesThaiShort[dayOfWeek]})</span>
                </div>
        `;

    if ((isWeekend || isStatutoryHoliday) && dayTasks.length === 0) {
      mobileCardHtml += `<div onclick="openTaskModal(null, '${dateStr}', 'MORNING')" class="py-2 text-center text-xs text-slate-400 bg-slate-100/50 rounded-xl cursor-pointer">🛑 วันหยุดพักผ่อน</div>`;
    } else {
      mobileCardHtml += `<div class="space-y-1.5">`;
      if (morningTasks.length > 0) {
        mobileCardHtml += renderMobileTaskRow(
          morningTasks[0],
          "เช้า (08:30–12:00)",
        );
      } else {
        mobileCardHtml += renderMobileEmptyRow(dateStr, "MORNING", "เช้า");
      }

      if (morningTasks.length > 0 && morningTasks[0].slot === "FULL_DAY") {
        // Covered
      } else if (afternoonTasks.length > 0) {
        mobileCardHtml += renderMobileTaskRow(
          afternoonTasks[0],
          "บ่าย (13:00–16:30)",
        );
      } else {
        mobileCardHtml += renderMobileEmptyRow(dateStr, "AFTERNOON", "บ่าย");
      }
      mobileCardHtml += `</div>`;
    }

    mobileCardHtml += `</div>`;
    listMobile.innerHTML += mobileCardHtml;
  }

  updateStats(totalDays, weekendCount);
  lucide.createIcons();
}

function renderDesktopTaskBadge(task, slotLabel) {
  const levelColors = {
    DISTRICT: "bg-red-50 text-red-700 border-red-200",
    SUB_DISTRICT: "bg-blue-50 text-blue-700 border-blue-200",
    VILLAGE: "bg-emerald-50 text-emerald-700 border-emerald-200",
  };
  const missionIcons = { MISSION_4: "🏢", MISSION_5: "🤝", SELF_DEV: "🎓" };

  return `
        <div onclick="openTaskModal('${task.id}')" class="task-badge-pill cursor-pointer border text-[10px] p-1.5 rounded-xl font-semibold flex items-center justify-between gap-1 ${levelColors[task.level]}">
            <span class="truncate">${missionIcons[task.missionType]} ${task.project}</span>
            ${task.images && task.images.length > 0 ? '<span class="text-[9px]">📷</span>' : ""}
        </div>
    `;
}

function renderDesktopEmptySlot(dateStr, slot, slotLabel) {
  return `
        <div onclick="openTaskModal(null, '${dateStr}', '${slot}')" class="border border-dashed border-slate-200 rounded-xl p-1 text-[10px] text-slate-400 hover:border-blue-400 hover:text-blue-600 transition cursor-pointer text-center flex-1 flex items-center justify-center">
            <span>+ ${slotLabel}</span>
        </div>
    `;
}

function renderMobileTaskRow(task, slotTimeText) {
  const levelColors = {
    DISTRICT: "bg-red-50 border-red-200 text-red-700",
    SUB_DISTRICT: "bg-blue-50 border-blue-200 text-blue-700",
    VILLAGE: "bg-emerald-50 border-emerald-200 text-emerald-700",
  };
  return `
        <div onclick="openTaskModal('${task.id}')" class="p-2.5 rounded-xl border flex items-center justify-between cursor-pointer ${levelColors[task.level]}">
            <div class="overflow-hidden pr-2">
                <div class="text-[10px] opacity-75 font-medium">${slotTimeText}</div>
                <div class="text-xs font-bold truncate">${task.project}</div>
            </div>
            <i data-lucide="chevron-right" class="w-4 h-4 text-slate-400 shrink-0"></i>
        </div>
    `;
}

function renderMobileEmptyRow(dateStr, slot, slotTimeText) {
  return `
        <div onclick="openTaskModal(null, '${dateStr}', '${slot}')" class="p-2 rounded-xl border border-dashed text-slate-400 flex items-center justify-between cursor-pointer text-xs">
            <span>🟢 ${slotTimeText} ว่าง</span>
            <span class="text-blue-600 font-semibold">+ เพิ่ม</span>
        </div>
    `;
}

function updateStats(totalDaysInMonth, weekendCount) {
  const currentMonthPrefix = `${currentYear}-${(currentMonth + 1).toString().padStart(2, "0")}`;
  const monthTasks = tasks.filter(
    (t) =>
      (t.date && t.date.startsWith(currentMonthPrefix)) ||
      (t.dateStart && t.dateStart.startsWith(currentMonthPrefix)),
  );

  document.getElementById("stat-district").innerText = monthTasks.filter(
    (t) => t.level === "DISTRICT",
  ).length;
  document.getElementById("stat-subdistrict").innerText = monthTasks.filter(
    (t) => t.level === "SUB_DISTRICT",
  ).length;
  document.getElementById("stat-village").innerText = monthTasks.filter(
    (t) => t.level === "VILLAGE",
  ).length;

  let takenSlots = 0;
  monthTasks.forEach((t) => (takenSlots += t.slot === "FULL_DAY" ? 2 : 1));
  const totalWorkSlots = (totalDaysInMonth - weekendCount) * 2;
  document.getElementById("stat-empty").innerText = Math.max(
    0,
    totalWorkSlots - takenSlots,
  );

  const completeCount = monthTasks.filter(
    (t) =>
      t.project &&
      (t.missionType === "SELF_DEV" || t.objective) &&
      t.result &&
      t.approverName,
  ).length;
  const progressPercent =
    monthTasks.length > 0
      ? Math.round((completeCount / monthTasks.length) * 100)
      : 0;

  document.getElementById("stat-progress-text").innerText =
    `พร้อมส่ง ${completeCount}/${monthTasks.length} รายการ (${progressPercent}%)`;
  document.getElementById("stat-progress-bar").style.width =
    `${progressPercent}%`;
}

function openTaskModal(taskId = null, date = null, slot = "MORNING") {
  document.getElementById("task-form").reset();
  document.getElementById("btn-delete").classList.add("hidden");
  switchFormTab("details");
  tempImages = [];

  if (taskId) {
    const task = tasks.find((t) => t.id === taskId);
    document.getElementById("modal-title").innerText =
      "แก้ไขข้อมูลการปฏิบัติงาน";
    document.getElementById("task-id").value = task.id;
    document.getElementById("task-mission-type").value =
      task.missionType || "MISSION_4";
    document.getElementById("task-level").value = task.level || "DISTRICT";
    document.getElementById("task-fiscal-year").value =
      task.fiscalYear || "2569";
    document.getElementById("task-date").value =
      task.date || task.dateStart || "";
    document.getElementById("task-date-start").value =
      task.dateStart || task.date || "";
    document.getElementById("task-date-end").value =
      task.dateEnd || task.date || "";
    document.getElementById("task-slot").value = task.slot || "MORNING";
    document.getElementById("task-time-start").value =
      task.timeStart || "08:30";
    document.getElementById("task-time-end").value = task.timeEnd || "16:30";
    document.getElementById("task-province").value = task.province || "ตรัง";
    document.getElementById("task-district").value =
      task.district || "เมืองตรัง";
    document.getElementById("task-subdistrict").value = task.subdistrict || "";
    document.getElementById("task-village").value = task.village || "";
    document.getElementById("task-project").value = task.project || "";
    document.getElementById("task-objective").value = task.objective || "";
    document.getElementById("task-mission").value = task.mission || "";
    document.getElementById("task-result").value = task.result || "";
    document.getElementById("task-approver-name").value =
      task.approverName || "";
    document.getElementById("task-approver-pos").value = task.approverPos || "";

    if (task.images && Array.isArray(task.images)) {
      tempImages = [...task.images];
    }

    document.getElementById("btn-delete").classList.remove("hidden");
  } else {
    document.getElementById("modal-title").innerText =
      "เพิ่มข้อมูลปฏิบัติงานใหม่";
    document.getElementById("task-id").value = "";
    document.getElementById("task-mission-type").value = "MISSION_4";
    if (date) {
      document.getElementById("task-date").value = date;
      document.getElementById("task-date-start").value = date;
      document.getElementById("task-date-end").value = date;
    }
    document.getElementById("task-slot").value = slot;
    updateTimeInputs();
  }

  renderImagePreviews();
  toggleMissionFields();
  document.getElementById("task-modal").classList.remove("hidden");
}

function closeTaskModal() {
  document.getElementById("task-modal").classList.add("hidden");
}

async function saveTask(e) {
  e.preventDefault();
  const id = document.getElementById("task-id").value || Date.now().toString();
  const missionType = document.getElementById("task-mission-type").value;

  let finalDate = document.getElementById("task-date").value;
  if (missionType === "SELF_DEV") {
    finalDate = document.getElementById("task-date-start").value;
  }

  const taskData = {
    id,
    missionType,
    level: document.getElementById("task-level").value,
    fiscalYear: document.getElementById("task-fiscal-year").value,
    date: finalDate,
    dateStart: document.getElementById("task-date-start").value,
    dateEnd: document.getElementById("task-date-end").value,
    slot: document.getElementById("task-slot").value,
    timeStart: document.getElementById("task-time-start").value,
    timeEnd: document.getElementById("task-time-end").value,
    province: document.getElementById("task-province").value,
    district: document.getElementById("task-district").value,
    subdistrict: document.getElementById("task-subdistrict").value,
    village: document.getElementById("task-village").value,
    project: document.getElementById("task-project").value,
    objective: document.getElementById("task-objective").value,
    mission: document.getElementById("task-mission").value,
    result: document.getElementById("task-result").value,
    approverName: document.getElementById("task-approver-name").value,
    approverPos: document.getElementById("task-approver-pos").value,
    images: tempImages,
  };

  await saveTaskToCloud(taskData);
  closeTaskModal();
  showToast("บันทึกข้อมูลเรียบร้อยแล้ว");
}

async function deleteTask() {
  const id = document.getElementById("task-id").value;
  if (confirm("คุณต้องการลบงานนี้ใช่หรือไม่?")) {
    await deleteTaskFromCloud(id);
    closeTaskModal();
    showToast("ลบรายการงานเรียบร้อยแล้ว");
  }
}

function openHolidayModal() {
  const monthStr = (currentMonth + 1).toString().padStart(2, "0");
  document.getElementById("holiday-picker").value =
    `${currentYear}-${monthStr}-01`;
  renderHolidayList();
  document.getElementById("holiday-modal").classList.remove("hidden");
}

function closeHolidayModal() {
  document.getElementById("holiday-modal").classList.add("hidden");
}

async function addHolidayFromPicker() {
  const val = document.getElementById("holiday-picker").value;
  if (!val) return alert("กรุณาเลือกวันที่ก่อนบันทึก");
  if (!holidays.includes(val)) {
    await saveHolidayToCloud(val);
    renderHolidayList();
    showToast("เพิ่มวันหยุดเรียบร้อยแล้ว");
  }
}

async function removeHoliday(dateStr) {
  if (confirm(`ยกเลิกวันหยุดวันที่ ${formatThaiDate(dateStr)} ใช่หรือไม่?`)) {
    await deleteHolidayFromCloud(dateStr);
    renderHolidayList();
    showToast("ยกเลิกวันหยุดแล้ว");
  }
}

function renderHolidayList() {
  const container = document.getElementById("holiday-list-items");
  container.innerHTML = "";
  const currentMonthPrefix = `${currentYear}-${(currentMonth + 1).toString().padStart(2, "0")}`;
  const monthHolidays = holidays
    .filter((h) => h.startsWith(currentMonthPrefix))
    .sort();

  if (monthHolidays.length === 0) {
    container.innerHTML = `<div class="text-xs text-slate-400 text-center py-2">ไม่มีวันหยุดในเดือนนี้</div>`;
    return;
  }

  monthHolidays.forEach((h) => {
    container.innerHTML += `
            <div class="flex items-center justify-between p-2 rounded-xl bg-slate-50 border border-slate-100 text-xs">
                <span class="font-medium text-slate-700">🛑 ${formatThaiDate(h)}</span>
                <button onclick="removeHoliday('${h}')" class="text-red-600 font-bold px-2 py-0.5 rounded">ลบออก</button>
            </div>
        `;
  });
}

function toggleTaskAccordion(id) {
  const content = document.getElementById(`acc-content-${id}`);
  const icon = document.getElementById(`acc-icon-${id}`);
  if (content.classList.contains("hidden")) {
    content.classList.remove("hidden");
    icon.style.transform = "rotate(180deg)";
  } else {
    content.classList.add("hidden");
    icon.style.transform = "rotate(0deg)";
  }
}

function renderReadinessList() {
  const container = document.getElementById("readiness-list");
  container.innerHTML = "";
  const currentMonthPrefix = `${currentYear}-${(currentMonth + 1).toString().padStart(2, "0")}`;
  const monthTasks = tasks
    .filter(
      (t) =>
        (t.date && t.date.startsWith(currentMonthPrefix)) ||
        (t.dateStart && t.dateStart.startsWith(currentMonthPrefix)),
    )
    .sort((a, b) =>
      (a.date || a.dateStart).localeCompare(b.date || b.dateStart),
    );

  let readyCount = 0;
  if (monthTasks.length === 0) {
    container.innerHTML = `<div class="text-center py-12 text-slate-400 text-xs">ไม่มีรายการงานในเดือนนี้</div>`;
  }

  monthTasks.forEach((t) => {
    const missionType = t.missionType || "MISSION_4";
    const isReady =
      t.project &&
      (t.missionType === "SELF_DEV" || t.objective) &&
      t.result &&
      t.approverName;
    if (isReady) readyCount++;

    let fields = [
      { label: "ปีงบประมาณ", value: t.fiscalYear || "2569" },
      {
        label: "วันที่ปฏิบัติงาน",
        value: formatThaiDate(t.date || t.dateStart),
      },
      { label: "เวลามา-เวลากลับ", value: `${t.timeStart} - ${t.timeEnd}` },
      {
        label: "สถานที่",
        value:
          `${t.province} ${t.district} ${t.subdistrict} ${t.village}`.trim(),
      },
      { label: "ชื่อโครงการ/กิจกรรม", value: t.project },
      { label: "วัตถุประสงค์", value: t.objective },
      { label: "ผลการดำเนินงาน", value: t.result },
      { label: "ผู้รับรอง", value: `${t.approverName} (${t.approverPos})` },
    ];

    container.innerHTML += `
            <div class="border border-slate-200 rounded-2xl overflow-hidden bg-white shadow-sm">
                <div onclick="toggleTaskAccordion('${t.id}')" class="p-3.5 bg-slate-50 hover:bg-slate-100/80 cursor-pointer flex items-center justify-between gap-2 transition">
                    <div class="flex items-center gap-2 overflow-hidden">
                        <span class="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 shrink-0">${missionType}</span>
                        <span class="text-xs font-bold text-slate-800 shrink-0">${formatThaiDate(t.date || t.dateStart)}</span>
                        <span class="text-xs text-slate-600 truncate">— ${t.project}</span>
                    </div>
                    <div class="flex items-center gap-2">
                        ${isReady ? '<span class="text-[10px] bg-emerald-100 text-emerald-700 font-bold px-2.5 py-0.5 rounded-full">พร้อมลง MPP</span>' : '<span class="text-[10px] bg-red-100 text-red-700 font-bold px-2.5 py-0.5 rounded-full">ขาดข้อมูล</span>'}
                        <i data-lucide="chevron-down" id="acc-icon-${t.id}" class="w-4 h-4 text-slate-400 transition-transform"></i>
                    </div>
                </div>

                <div id="acc-content-${t.id}" class="hidden p-4 border-t border-slate-100 bg-white space-y-2">
                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        ${fields
                          .map(
                            (f) => `
                            <div class="flex items-center justify-between p-2.5 rounded-xl border border-slate-100 bg-slate-50">
                                <div class="overflow-hidden pr-2">
                                    <div class="text-[10px] font-semibold text-slate-400">${f.label}</div>
                                    <div class="text-xs text-slate-800 font-medium truncate">${f.value || '<span class="text-red-400">ยังไม่ได้กรอก</span>'}</div>
                                </div>
                                <button onclick="copyField('${(f.value || "").replace(/'/g, "\\'")}', '${f.label}')" class="bg-white hover:bg-blue-50 hover:text-blue-600 text-slate-700 text-xs px-3 py-1.5 rounded-lg border border-slate-200 shadow-sm transition shrink-0 font-medium">
                                    คัดลอก
                                </button>
                            </div>
                        `,
                          )
                          .join("")}
                    </div>
                </div>
            </div>
        `;
  });

  document.getElementById("readiness-summary").innerText =
    `พร้อม ${readyCount} / ทั้งหมด ${monthTasks.length}`;
  lucide.createIcons();
}
