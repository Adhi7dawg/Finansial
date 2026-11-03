import { getFirestore, collection, addDoc, updateDoc, deleteDoc, doc, getDocs, query, where, orderBy, Timestamp, serverTimestamp }
  from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { app } from "./firebase-config.js";

const db = getFirestore(app);
const col = (uid) => collection(db, "users", uid, "transactions");

// Rentang [start, end) pada field date saja (tanpa composite index).
export async function listRange(uid, start, end) {
  const q = query(col(uid), where("date", ">=", Timestamp.fromDate(start)), where("date", "<", Timestamp.fromDate(end)), orderBy("date"));
  const snap = await getDocs(q);
  return snap.docs.map((d) => {
    const x = d.data();
    return { id: d.id, type: x.type, amount: x.amount, note: x.note || "", category: x.category || "", date: x.date.toDate() };
  });
}

function payload(t) {
  const p = { type: t.type, amount: t.amount, date: Timestamp.fromDate(t.date), note: t.note || "" };
  if (t.type === "expense") p.category = t.category;
  return p;
}

export const addTx = (uid, t) => addDoc(col(uid), { ...payload(t), createdAt: serverTimestamp() });
export const updateTx = (uid, id, t) => updateDoc(doc(db, "users", uid, "transactions", id), payload(t));
export const deleteTx = (uid, id) => deleteDoc(doc(db, "users", uid, "transactions", id));
