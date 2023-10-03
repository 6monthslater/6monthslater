import type { FirebaseApp } from "firebase/app";
import { initializeApp } from "firebase/app";

declare global {
  var __firebase: FirebaseApp; //eslint-disable-line
}

// The inclusion of the API key is intentional and is suggested by Firebase
const firebaseConfig = {
  apiKey: "AIzaSyDggGykUMy7Edsogs_U4H_JWt4J_geSGhE",
  authDomain: "sixmonthslater.firebaseapp.com",
  projectId: "sixmonthslater",
  storageBucket: "sixmonthslater.appspot.com",
  messagingSenderId: "65812528006",
  appId: "1:65812528006:web:d36271506dc6c278a5ca07",
  measurementId: "G-JZK1EXTLLG",
};

if (!global.__firebase) {
  global.__firebase = initializeApp(firebaseConfig);
}

export const firebase = global.__firebase;
