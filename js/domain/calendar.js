// ABOUTME: Pure calendar rules: Thai date/time formatting, rest days, and slot conflicts.
// ABOUTME: No DOM or Firestore here; callers pass a calendar {tasks, holidays, workdays}.

export const MONTHS = [
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

export const SLOTS = {
  MORNING: { label: "เช้า", start: "08:30", end: "12:00", cls: "morning" },
  AFTERNOON: { label: "บ่าย", start: "13:00", end: "16:30", cls: "afternoon" },
  FULL_DAY: { label: "ทั้งวัน", start: "08:30", end: "16:30", cls: "full" },
};

export const pad = (n) => String(n).padStart(2, "0");
// month is 0-based, as in Date.
export const ymd = (y, m, d) => `${y}-${pad(m + 1)}-${pad(d)}`;
// Thai time notation: 08:30 -> "08.30 น."
export const thaiTime = (hhmm) => `${hhmm.replace(":", ".")} น.`;
export const thaiTimeRange = (task) =>
  `${thaiTime(task.timeStart)} – ${thaiTime(task.timeEnd)}`;
export const thaiDate = (iso) => {
  const [y, m, d] = iso.split("-").map(Number);
  return `${d} ${MONTHS[m - 1]} ${y + 543}`;
};

export const MONTHS_SHORT = [
  "ม.ค.",
  "ก.พ.",
  "มี.ค.",
  "เม.ย.",
  "พ.ค.",
  "มิ.ย.",
  "ก.ค.",
  "ส.ค.",
  "ก.ย.",
  "ต.ค.",
  "พ.ย.",
  "ธ.ค.",
];

// Compact Thai date for lists: "2026-11-10" -> "10 พ.ย. 69".
export const formatThaiShort = (iso) => {
  const [y, m, d] = iso.split("-").map(Number);
  return `${d} ${MONTHS_SHORT[m - 1]} ${String(y + 543).slice(-2)}`;
};

// Reads what a Thai user types, "dd/mm/yyyy" in Buddhist Era (or "dd/mm/yy" as 25yy),
// and returns the stored CE ISO date, or null if the input is not a real date.
// Years below 2400 are refused: they are CE years typed by mistake.
export function parseThaiDate(text) {
  const match = /^(\d{1,2})\/(\d{1,2})\/(\d{2}|\d{4})$/.exec(text.trim());
  if (!match) return null;
  const [d, m] = [Number(match[1]), Number(match[2])];
  const be = match[3].length === 2 ? 2500 + Number(match[3]) : Number(match[3]);
  if (be < 2400) return null;
  const y = be - 543;
  // Date rolls 31/04 over to 1/05, so a round trip exposes impossible days.
  const date = new Date(y, m - 1, d);
  if (date.getFullYear() !== y || date.getMonth() !== m - 1 || date.getDate() !== d)
    return null;
  return ymd(y, m - 1, d);
}

export function isWeekend(iso) {
  const [y, m, d] = iso.split("-").map(Number);
  const weekday = new Date(y, m - 1, d).getDay();
  return weekday === 0 || weekday === 6;
}

// A day is a rest day if it is a holiday, or a weekend not marked as a working day.
export function isRest(iso, { holidays, workdays }) {
  if (holidays.has(iso)) return true;
  return isWeekend(iso) && !workdays.has(iso);
}

export function tasksOn(tasks, iso) {
  return tasks
    .filter((t) => t.date === iso)
    .sort((a, b) => a.timeStart.localeCompare(b.timeStart));
}

// Returns the reason a task with this slot cannot be placed on this date, or null if it can.
export function addBlockReason(calendar, iso, slot, excludeId) {
  if (isRest(iso, calendar))
    return "วันนี้เป็นวันหยุด ต้องยกเลิกวันหยุดก่อนจึงจะเพิ่มงานได้";
  const others = tasksOn(calendar.tasks, iso).filter((t) => t.id !== excludeId);
  if (others.some((t) => t.slot === "FULL_DAY")) {
    return "วันนี้มีงานทั้งวันแล้ว ต้องลบงานทั้งวันก่อนจึงจะเพิ่มงานได้";
  }
  if (slot === "FULL_DAY" && others.length > 0) {
    return "วันนี้มีงานช่วงเช้าหรือบ่ายอยู่แล้ว ต้องลบงานเหล่านั้นก่อนจึงจะเพิ่มงานทั้งวันได้";
  }
  return null;
}

// Task docs may hold fields from older app versions (images, mission, ...) that the
// form does not show. Saving must keep them, so form fields are laid over the stored doc.
export function mergeTask(existing, fields) {
  return { ...existing, ...fields };
}

// Returns why this day cannot become a rest day, or null if it can.
// Rest days hold no tasks, matching addBlockReason which refuses tasks on rest days.
export function restBlockReason(calendar, iso) {
  if (tasksOn(calendar.tasks, iso).length > 0)
    return "วันนี้มีงานอยู่ ต้องลบหรือย้ายงานก่อนจึงจะตั้งเป็นวันหยุดได้";
  return null;
}

// Years for the year picker: last year to five years ahead, widened to include shownYear.
export function yearOptions(currentYear, shownYear) {
  const first = Math.min(currentYear - 1, shownYear);
  const last = Math.max(currentYear + 5, shownYear);
  return Array.from({ length: last - first + 1 }, (_, i) => first + i);
}
