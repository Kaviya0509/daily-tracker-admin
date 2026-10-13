import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyDdjcMy4VqX0sAxyTKDdFL0FOFOYD2a07k",
  authDomain: "daily-tracker-27f30.firebaseapp.com",
  projectId: "daily-tracker-27f30",
  storageBucket: "daily-tracker-27f30.firebasestorage.app",
  messagingSenderId: "102261470238",
  appId: "1:102261470238:web:d48b1e47b755122b666a0f",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app, "default");

async function checkCollections() {
  console.log("Checking menteeReports collection in daily-tracker-27f30 (default)...");
  try {
    const snap = await getDocs(collection(db, "menteeReports"));
    console.log(`menteeReports found: ${snap.size} documents`);
    snap.docs.forEach((d) => console.log(`- ID: ${d.id}`, d.data()));
  } catch (err) {
    console.error("Error reading menteeReports:", err.code, err.message);
  }

  console.log("\nChecking users collection...");
  try {
    const snap = await getDocs(collection(db, "users"));
    console.log(`users found: ${snap.size} documents`);
    snap.docs.forEach((d) => console.log(`- ID: ${d.id}`, d.data()));
  } catch (err) {
    console.error("Error reading users:", err.code, err.message);
  }

  process.exit(0);
}

checkCollections();
