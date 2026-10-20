import { initializeApp } from "firebase/app";
import { getAI, GoogleAIBackend } from "firebase/ai";

export const app = initializeApp({
  apiKey: process.env.FIREBASE_API_KEY ?? "AIzaSyDemoKeyForLocalDev000000000000",
  authDomain: "acme-voice.firebaseapp.com",
  projectId: "acme-voice",
  appId: "1:418273645:web:3f9c2a7b1d",
});

export const ai = getAI(app, { backend: new GoogleAIBackend() });
