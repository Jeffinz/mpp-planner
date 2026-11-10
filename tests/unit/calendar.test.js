// ABOUTME: Unit tests for the pure calendar rules in js/domain/calendar.js.
// ABOUTME: Covers Thai formatting, rest-day logic, slot conflicts, and task merging.
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  ymd,
  thaiDate,
  thaiTimeRange,
  isWeekend,
  isRest,
  tasksOn,
  addBlockReason,
  mergeTask,
} from "../../js/domain/calendar.js";

const task = (id, date, slot, timeStart = "08:30") => ({
  id,
  date,
  slot,
  timeStart,
  timeEnd: "12:00",
  project: `p${id}`,
});
const calendar = ({ tasks = [], holidays = [], workdays = [] } = {}) => ({
  tasks,
  holidays: new Set(holidays),
  workdays: new Set(workdays),
});

// 2026-11-10 is a Tuesday; 2026-11-14 a Saturday; 2026-11-15 a Sunday.
const TUE = "2026-11-10";
const SAT = "2026-11-14";
const SUN = "2026-11-15";

test("ymd builds zero-padded ISO dates from a 0-based month", () => {
  assert.equal(ymd(2026, 0, 5), "2026-01-05");
  assert.equal(ymd(2026, 11, 31), "2026-12-31");
});

test("thaiDate uses Thai month names and the Buddhist year", () => {
  assert.equal(thaiDate(TUE), "10 พฤศจิกายน 2569");
  assert.equal(thaiDate("2027-01-01"), "1 มกราคม 2570");
});

test("thaiTimeRange formats times in Thai notation", () => {
  assert.equal(
    thaiTimeRange({ timeStart: "08:30", timeEnd: "12:00" }),
    "08.30 น. – 12.00 น.",
  );
});

test("isWeekend is true only for Saturday and Sunday", () => {
  assert.equal(isWeekend(TUE), false);
  assert.equal(isWeekend(SAT), true);
  assert.equal(isWeekend(SUN), true);
});

test("isRest: weekdays work unless marked holiday", () => {
  assert.equal(isRest(TUE, calendar()), false);
  assert.equal(isRest(TUE, calendar({ holidays: [TUE] })), true);
});

test("isRest: weekends rest unless marked workday", () => {
  assert.equal(isRest(SAT, calendar()), true);
  assert.equal(isRest(SAT, calendar({ workdays: [SAT] })), false);
});

test("tasksOn returns that day's tasks sorted by start time", () => {
  const tasks = [
    task("a", TUE, "AFTERNOON", "13:00"),
    task("b", "2026-11-11", "MORNING"),
    task("c", TUE, "MORNING", "08:30"),
  ];
  assert.deepEqual(
    tasksOn(tasks, TUE).map((t) => t.id),
    ["c", "a"],
  );
});

test("addBlockReason allows a free working day", () => {
  assert.equal(addBlockReason(calendar(), TUE, "MORNING"), null);
});

test("addBlockReason blocks rest days", () => {
  assert.match(
    addBlockReason(calendar({ holidays: [TUE] }), TUE, "MORNING"),
    /วันหยุด/,
  );
  assert.match(addBlockReason(calendar(), SAT, "MORNING"), /วันหยุด/);
});

test("addBlockReason allows a weekend marked as workday", () => {
  assert.equal(
    addBlockReason(calendar({ workdays: [SAT] }), SAT, "MORNING"),
    null,
  );
});

test("addBlockReason blocks anything on a day with a full-day task", () => {
  const cal = calendar({ tasks: [task("f", TUE, "FULL_DAY")] });
  assert.match(addBlockReason(cal, TUE, "AFTERNOON"), /ทั้งวันแล้ว/);
});

test("addBlockReason blocks a full-day task on a day with other tasks", () => {
  const cal = calendar({ tasks: [task("m", TUE, "MORNING")] });
  assert.match(addBlockReason(cal, TUE, "FULL_DAY"), /เช้าหรือบ่าย/);
});

test("addBlockReason allows two tasks in the same half-day slot", () => {
  const cal = calendar({ tasks: [task("m", TUE, "MORNING")] });
  assert.equal(addBlockReason(cal, TUE, "MORNING"), null);
});

test("addBlockReason ignores the task being edited", () => {
  const cal = calendar({ tasks: [task("m", TUE, "MORNING")] });
  assert.equal(addBlockReason(cal, TUE, "FULL_DAY", "m"), null);
});

test("mergeTask keeps legacy fields the form does not edit", () => {
  const existing = {
    ...task("old", TUE, "MORNING"),
    images: ["x.jpg"],
    mission: "m1",
  };
  const merged = mergeTask(existing, {
    id: "old",
    date: TUE,
    slot: "AFTERNOON",
    timeStart: "13:00",
    timeEnd: "16:30",
    project: "edited",
  });
  assert.deepEqual(merged.images, ["x.jpg"]);
  assert.equal(merged.mission, "m1");
  assert.equal(merged.slot, "AFTERNOON");
  assert.equal(merged.project, "edited");
});

test("mergeTask with no existing task returns just the form fields", () => {
  const fields = task("n", TUE, "MORNING");
  assert.deepEqual(mergeTask(undefined, fields), fields);
});
