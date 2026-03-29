import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getFunctions } from "firebase/functions";

const firebaseConfig = {
    apiKey: "AIzaSyCWlrrfNn6q4GhhL2H7goHjQMd3MsprxOE",
    authDomain: "tanqueteambjj.firebaseapp.com",
    projectId: "tanqueteambjj",
    storageBucket: "tanqueteambjj.firebasestorage.app",
    messagingSenderId: "410605992451",
    appId: "1:410605992451:web:f0f341f4594fe75f376c36"
};

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const auth = getAuth(app);
const db = getFirestore(app);
const functions = getFunctions(app, 'us-central1');

export { app, auth, db, functions };
