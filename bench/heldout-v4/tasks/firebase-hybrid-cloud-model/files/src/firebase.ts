import { initializeApp } from "firebase/app";
import { getAI, GoogleAIBackend } from "firebase/ai";

export const app = initializeApp({
  apiKey: process.env.FIREBASE_API_KEY ?? "AIzaSyDemoKeyForLocalDev000000000000",
  authDomain: "acme-notes.firebaseapp.com",
  projectId: "acme-notes",
  appId: "1:556677889:web:4b2e9d7c1a",
});

export const ai = getAI(app, { backend: new GoogleAIBackend() });
