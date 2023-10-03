import type { FirebaseApp } from "firebase/app";
import { initializeApp } from "firebase/app";
import type { Auth } from "@firebase/auth";
import { getAuth } from "@firebase/auth";

declare global {
  var __firebase: FirebaseApp; //eslint-disable-line
  var __auth: Auth; //eslint-disable-line
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

if (!global.__auth) {
  global.__auth = getAuth(global.__firebase);
}

export const firebase = global.__firebase;
export const auth = global.__auth;
