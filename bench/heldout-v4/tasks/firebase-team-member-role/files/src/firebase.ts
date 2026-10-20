import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

export const app = initializeApp({
  apiKey: process.env.FIREBASE_API_KEY ?? "AIzaSyDemoKeyForLocalDev000000000000",
  authDomain: "acme-teams.firebaseapp.com",
  projectId: "acme-teams",
  appId: "1:246813579:web:1c2d3e4f5a",
});

export const db = getFirestore(app);
