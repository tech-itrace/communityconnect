import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore"; // ✅ Firestore import

const firebaseConfig = {
    apiKey: "AIzaSyCdFacOUmGyKCuiAqVAJHrqYEpt8DWmo3o",
    authDomain: "my-workflow-signup.firebaseapp.com",
    projectId: "my-workflow-signup",
    storageBucket: "my-workflow-signup.firebasestorage.app",
    messagingSenderId: "546700893203",
    appId: "1:546700893203:web:ae8cfe32e91038c76b33e6",
    measurementId: "G-3Y7EMCH5PN"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app); // ✅ Firestore export
