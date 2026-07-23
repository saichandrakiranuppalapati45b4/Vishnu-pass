import { getFunctions, httpsCallable } from 'firebase/functions';
import { app } from '../config/firebase';

const functions = getFunctions(app);

// In local development, you might want to connect to the emulator
// import { connectFunctionsEmulator } from 'firebase/functions';
// connectFunctionsEmulator(functions, "localhost", 5001);

export const generateQrToken = httpsCallable(functions, 'generateQrToken');
export const verifyQrToken = httpsCallable(functions, 'verifyQrToken');
export const createStudentAccount = httpsCallable(functions, 'createStudentAccount');
export const createGuardAccount = httpsCallable(functions, 'createGuardAccount');
