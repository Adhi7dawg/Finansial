import { getAuth, onAuthStateChanged, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut }
  from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { app } from "./firebase-config.js";

export const auth = getAuth(app);

const ERR = {
  "auth/email-already-in-use": "Email ini sudah terdaftar. Silakan masuk.",
  "auth/invalid-email": "Format email tidak valid.",
  "auth/weak-password": "Kata sandi minimal 6 karakter.",
  "auth/user-not-found": "Akun dengan email ini tidak ditemukan.",
  "auth/wrong-password": "Kata sandi salah.",
  "auth/invalid-credential": "Email atau kata sandi salah.",
  "auth/missing-password": "Kata sandi wajib diisi.",
  "auth/too-many-requests": "Terlalu banyak percobaan. Coba lagi beberapa saat.",
  "auth/network-request-failed": "Koneksi internet bermasalah. Coba lagi.",
  "auth/operation-not-allowed": "Login email/password belum diaktifkan di Firebase.",
  "auth/api-key-not-valid": "Konfigurasi Firebase belum diisi dengan benar."
};

export const authError = (e) => ERR[e?.code] || "Terjadi kesalahan. Coba lagi.";
export const onAuth = (cb) => onAuthStateChanged(auth, cb);
export const login = (email, pw) => signInWithEmailAndPassword(auth, email, pw);
export const register = (email, pw) => createUserWithEmailAndPassword(auth, email, pw);
export const logout = () => signOut(auth);
