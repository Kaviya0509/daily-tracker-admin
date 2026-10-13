import { initializeApp } from "firebase/app";
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword } from "firebase/auth";
import { getFirestore, collection, getDocs, doc, setDoc, query, where, getDoc } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyDdjcMy4VqX0sAxyTKDdFL0FOFOYD2a07k",
  authDomain: "daily-tracker-27f30.firebaseapp.com",
  projectId: "daily-tracker-27f30",
  storageBucket: "daily-tracker-27f30.firebasestorage.app",
  messagingSenderId: "102261470238",
  appId: "1:102261470238:web:d48b1e47b755122b666a0f",
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app, "default");

async function testMentee() {
  console.log("=== Testing Mentee Auth and Write ===");
  const testEmail = "testmentee@example.com";
  const testPass = "Test@12345";
  let user;
  try {
    const res = await signInWithEmailAndPassword(auth, testEmail, testPass);
    user = res.user;
    console.log("Mentee signed in:", user.email, user.uid);
  } catch (e) {
    console.log("Sign in failed:", e.code);
    try {
      const res = await createUserWithEmailAndPassword(auth, testEmail, testPass);
      user = res.user;
      console.log("Created test mentee:", user.email, user.uid);
    } catch (e2) {
      console.log("Create failed:", e2.code, e2.message);
    }
  }

  if (user) {
    const reportDate = "2026-10-13";
    const reportId = `${user.uid}_${reportDate}`;
    const reportData = {
      reportId,
      menteeUid: user.uid,
      menteeName: "Test Mentee",
      reportDate,
      currentTask: "Integration Testing Flow",
      status: "In Progress",
      shortDescription: "Testing mentee submit and admin fetch",
      managerLead: "Vishwa",
      blockerDependency: "",
      idleReasonWorkNeeded: "",
      expectedCompletion: "2026-10-14",
      notes: "Test notes",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    console.log("Attempting to write report:", reportId);
    try {
      await setDoc(doc(db, "menteeReports", reportId), reportData);
      console.log("Successfully wrote report!");
    } catch (err) {
      console.error("Failed to write report:", err.code, err.message);
    }

    console.log("Attempting to read own report by getDoc...");
    try {
      const snap = await getDoc(doc(db, "menteeReports", reportId));
      console.log("getDoc exists?", snap.exists(), snap.data());
    } catch (err) {
      console.error("Failed getDoc:", err.code, err.message);
    }

    console.log("Attempting to read own reports by query...");
    try {
      const q = query(collection(db, "menteeReports"), where("menteeUid", "==", user.uid));
      const qSnap = await getDocs(q);
      console.log(`Query found ${qSnap.size} reports.`);
    } catch (err) {
      console.error("Failed query own reports:", err.code, err.message);
    }
  }

  process.exit(0);
}

testMentee();
