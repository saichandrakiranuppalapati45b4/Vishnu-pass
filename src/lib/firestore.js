import { collection, doc, getDoc, getDocs, setDoc, updateDoc, deleteDoc, query, where, serverTimestamp } from 'firebase/firestore';
import { db } from '../config/firebase';

// ---------------------------
// USERS
// ---------------------------
export const createUserProfile = async (uid, data) => {
  const userRef = doc(db, 'users', uid);
  await setDoc(userRef, {
    ...data,
    uid,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  });
};

export const getUserProfile = async (uid) => {
  const docRef = doc(db, 'users', uid);
  const docSnap = await getDoc(docRef);
  if (docSnap.exists()) return { ...docSnap.data(), id: docSnap.id };
  return null;
};

// ---------------------------
// COLLEGES
// ---------------------------
export const createCollege = async (collegeId, data) => {
  const collegeRef = doc(db, 'colleges', collegeId);
  await setDoc(collegeRef, {
    ...data,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  });
};

export const getCollege = async (collegeId) => {
  const docRef = doc(db, 'colleges', collegeId);
  const docSnap = await getDoc(docRef);
  if (docSnap.exists()) return { ...docSnap.data(), id: docSnap.id };
  return null;
};

export const getColleges = async () => {
  const querySnapshot = await getDocs(collection(db, 'colleges'));
  return querySnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));
};

// ---------------------------
// STUDENTS
// ---------------------------
export const createStudent = async (collegeId, studentId, data) => {
  const studentRef = doc(db, `colleges/${collegeId}/students`, studentId);
  await setDoc(studentRef, {
    ...data,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  });
};

export const getStudentsByCollege = async (collegeId) => {
  const querySnapshot = await getDocs(collection(db, `colleges/${collegeId}/students`));
  return querySnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));
};

// ---------------------------
// GUARDS
// ---------------------------
export const createGuard = async (collegeId, guardId, data) => {
  const guardRef = doc(db, `colleges/${collegeId}/guards`, guardId);
  await setDoc(guardRef, {
    ...data,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  });
};

export const getGuardsByCollege = async (collegeId) => {
  const querySnapshot = await getDocs(collection(db, `colleges/${collegeId}/guards`));
  return querySnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));
};

// ---------------------------
// SCAN LOGS
// ---------------------------
export const createScanLog = async (collegeId, logId, data) => {
  const logRef = doc(db, `colleges/${collegeId}/scanLogs`, logId);
  await setDoc(logRef, {
    ...data,
    scannedAt: serverTimestamp()
  });
};

export const getScanLogsByCollege = async (collegeId) => {
  const querySnapshot = await getDocs(collection(db, `colleges/${collegeId}/scanLogs`));
  return querySnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));
};
