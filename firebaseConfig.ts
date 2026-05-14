import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore"; // Importa o banco de dados

const firebaseConfig = {
  apiKey: "AIzaSyA_zv5XANtNOFcTdd04_j6KuipyHuP8AVQ",
  authDomain: "gamind-app.firebaseapp.com",
  projectId: "gamind-app",
  storageBucket: "gamind-app.firebasestorage.app",
  messagingSenderId: "474905016030",
  appId: "1:474905016030:web:0c7bd4f61dd4ec182bb44f",
  measurementId: "G-9ZGCEYL74C"
};

// Inicializa o Firebase
const app = initializeApp(firebaseConfig);

// Exporta o 'db' para usar na tela de avaliação
export const db = getFirestore(app);