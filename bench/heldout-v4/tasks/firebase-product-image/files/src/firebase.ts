import { initializeApp } from "firebase/app";
import { getAI, GoogleAIBackend } from "firebase/ai";

export const app = initializeApp({
  apiKey: process.env.FIREBASE_API_KEY ?? "AIzaSyDemoKeyForLocalDev000000000000",
  authDomain: "acme-shop.firebaseapp.com",
  projectId: "acme-shop",
  appId: "1:902837465:web:8e1d4c0f2a",
});

export const ai = getAI(app, { backend: new GoogleAIBackend() });
