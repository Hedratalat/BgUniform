// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyAx-9Ze2bYU-LDa5JYhGjRk8qFbRRLuYx0",
  authDomain: "bg-uniform.firebaseapp.com",
  projectId: "bg-uniform",
  storageBucket: "bg-uniform.firebasestorage.app",
  messagingSenderId: "145284993642",
  appId: "1:145284993642:web:74f02850cdfc8420137013",
  measurementId: "G-8MB1P1DKFL",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
export const auth = getAuth(app);
export const db = getFirestore(app);
