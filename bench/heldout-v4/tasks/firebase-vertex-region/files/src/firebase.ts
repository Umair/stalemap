import { initializeApp } from "firebase/app";

export const app = initializeApp({
  apiKey: process.env.FIREBASE_API_KEY ?? "AIzaSyDemoKeyForLocalDev000000000000",
  authDomain: "acme-eu.firebaseapp.com",
  projectId: "acme-eu",
  appId: "1:775533119:web:6f5e4d3c2b",
});
