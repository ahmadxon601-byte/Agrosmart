// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
    apiKey: "AIzaSyC2-DxK-IgriC8K_ONyED7jnDiydiRrBiw",
    authDomain: "monkmodeai-eb02e.firebaseapp.com",
    projectId: "monkmodeai-eb02e",
    storageBucket: "monkmodeai-eb02e.firebasestorage.app",
    messagingSenderId: "612942696296",
    appId: "1:612942696296:web:071d9f4b963dfa391190dd",
    measurementId: "G-3R2T8VK20J"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);