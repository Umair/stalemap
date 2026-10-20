import { initializeApp } from "firebase/app";
import { getAI, GoogleAIBackend } from "firebase/ai";

export const app = initializeApp({
  apiKey: process.env.FIREBASE_API_KEY ?? "AIzaSyDemoKeyForLocalDev000000000000",
  authDomain: "acme-help.firebaseapp.com",
  projectId: "acme-help",
  appId: "1:123987456:web:9a8b7c6d5e",
});

export const ai = getAI(app, { backend: new GoogleAIBackend() });
