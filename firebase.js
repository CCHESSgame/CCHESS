import { initializeApp } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js";
import {
    getAuth,
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    signOut,
    onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";
import {
    getFirestore,
    doc,
    setDoc,
    getDoc
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";


const firebaseConfig = {
    apiKey: "AIzaSyCviaG3ox4nrZciQBUZmOXdRr9zpDipVGg",
    authDomain: "cchess-db9a2.firebaseapp.com",
    projectId: "cchess-db9a2",
    storageBucket: "cchess-db9a2.firebasestorage.app",
    messagingSenderId: "931669373690",
    appId: "1:931669373690:web:4a9233bb78b7df6e2e8f43"
};


const app = initializeApp(firebaseConfig);

const auth = getAuth(app);

const db = getFirestore(app);


export {
    auth,
    db,

    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    signOut,
    onAuthStateChanged,

    doc,
    setDoc,
    getDoc
};