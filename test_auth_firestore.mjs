import { initializeApp } from "firebase/app";
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword } from "firebase/auth";
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
const auth = getAuth(app);
const db = getFirestore(app, "default");

async function testAuthAndFirestore() {
  console.log("=== Testing with Vishwa (Admin) ===");
  try {
    let user;
    try {
      const res = await signInWithEmailAndPassword(auth, "vishwa@gmail.com", "Vishwa@123");
      user = res.user;
      console.log("Signed in successfully as:", user.email, "uid:", user.uid);
    } catch (e) {
      console.log("Sign in failed:", e.code, e.message);
      if (e.code === "auth/user-not-found" || e.code === "auth/invalid-credential") {
        console.log("Attempting to create user vishwa@gmail.com...");
        const res = await createUserWithEmailAndPassword(auth, "vishwa@gmail.com", "Vishwa@123");
        user = res.user;
        console.log("Created user vishwa@gmail.com with uid:", user.uid);
      }
    }

    if (user) {
      const token = await user.getIdTokenResult();
      console.log("User claims:", token.claims);

      console.log("Attempting to read menteeReports...");
      try {
        const snap = await getDocs(collection(db, "menteeReports"));
        console.log(`Success! Read ${snap.size} documents from menteeReports.`);
        snap.forEach(d => console.log(d.id, d.data()));
      } catch (err) {
        console.error("Failed to read menteeReports as vishwa:", err.code, err.message);
      }
    }
  } catch (err) {
    console.error("General error:", err);
  }

  process.exit(0);
}

testAuthAndFirestore();
