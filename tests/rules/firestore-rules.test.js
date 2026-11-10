// ABOUTME: Firestore security rules tests, run against the Firestore emulator.
// ABOUTME: Only the owner uid named in firestore.rules may read or write the app's collections.
import { test, before, after, beforeEach } from "node:test";
import { readFileSync } from "node:fs";
import {
  initializeTestEnvironment,
  assertSucceeds,
  assertFails,
} from "@firebase/rules-unit-testing";
import { doc, getDoc, setDoc, deleteDoc } from "firebase/firestore";

const rules = readFileSync("firestore.rules", "utf8");
// The rules file is the one place the owner uid lives; tests read it from there.
const OWNER = rules.match(/request\.auth\.uid == "([^"]+)"/)[1];

let env;
before(async () => {
  env = await initializeTestEnvironment({
    projectId: "demo-mpp-planner",
    firestore: { rules, host: "127.0.0.1", port: 4180 },
  });
});
after(() => env.cleanup());
beforeEach(async () => {
  await env.clearFirestore();
  await env.withSecurityRulesDisabled((ctx) =>
    setDoc(doc(ctx.firestore(), "tasks/t1"), { id: "t1", project: "seed" }),
  );
});

const owner = () => env.authenticatedContext(OWNER).firestore();
const stranger = () => env.authenticatedContext("someone-else").firestore();
const anonymous = () => env.unauthenticatedContext().firestore();

for (const name of ["tasks", "holidays", "workdays"]) {
  test(`owner can read and write ${name}`, async () => {
    await assertSucceeds(setDoc(doc(owner(), `${name}/x`), { date: "2026-11-10" }));
    await assertSucceeds(getDoc(doc(owner(), `${name}/x`)));
    await assertSucceeds(deleteDoc(doc(owner(), `${name}/x`)));
  });
}

test("signed-out visitors cannot read or write", async () => {
  await assertFails(getDoc(doc(anonymous(), "tasks/t1")));
  await assertFails(setDoc(doc(anonymous(), "tasks/t2"), { id: "t2" }));
});

test("other signed-in users cannot read or write", async () => {
  await assertFails(getDoc(doc(stranger(), "tasks/t1")));
  await assertFails(setDoc(doc(stranger(), "holidays/2026-11-10"), {}));
  await assertFails(deleteDoc(doc(stranger(), "tasks/t1")));
});

test("owner cannot write outside the app's collections", async () => {
  await assertFails(setDoc(doc(owner(), "other/x"), {}));
});
