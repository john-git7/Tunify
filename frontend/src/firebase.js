// src/firebase.js
import { initializeApp, getApps } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';

const firebaseConfig = {
  apiKey: "AIzaSyA_S2-Qv73MFbcJINEZ9b-d93k2UEz3wqw",
  authDomain: "tunify-298bc.firebaseapp.com",
  projectId: "tunify-298bc",
  storageBucket: "tunify-298bc.appspot.com",
  messagingSenderId: "1038076135892",
  appId: "1:1038076135892:web:d8092256d63093b0c9ee41",
  measurementId: "G-BYGPHL1F7S"
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
const auth = getAuth(app);
const provider = new GoogleAuthProvider();

export { auth, provider };
