// ABOUTME: Dumps every Firestore collection the app uses to backups/<timestamp>.json.
// ABOUTME: Run with `npm run backup` before any rules change or data migration.
import { mkdir, writeFile } from "node:fs/promises";
import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, terminate } from "firebase/firestore";
import { firebaseConfig } from "../js/firebase-config.js";

const COLLECTIONS = ["tasks", "holidays", "workdays"];

const db = getFirestore(initializeApp(firebaseConfig));
const dump = {};
try {
  for (const name of COLLECTIONS) {
    const snapshot = await getDocs(collection(db, name));
    dump[name] = Object.fromEntries(snapshot.docs.map((d) => [d.id, d.data()]));
    console.log(`${name}: ${snapshot.size} docs`);
  }
} catch (err) {
  console.error(`backup failed: ${err.code ?? ""} ${err.message}`);
  console.error("If this is permission-denied, the Firestore rules block anonymous reads.");
  process.exitCode = 1;
} finally {
  await terminate(db);
}

if (!process.exitCode) {
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const file = `backups/${stamp}.json`;
  await mkdir("backups", { recursive: true });
  await writeFile(file, JSON.stringify(dump, null, 2));
  console.log(`wrote ${file}`);
}
