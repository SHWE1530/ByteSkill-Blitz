import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore, doc, getDocFromServer, increment as fIncrement } from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);
export const increment = fIncrement;

/**
 * Tactical utility to sanitize Firestore data into plain objects,
 * preventing circular reference crashes during state synchronization.
 */
export function toPlainObject(obj: any): any {
  if (obj === null || typeof obj !== 'object') return obj;

  // Handle Firestore Timestamp
  if (typeof obj.toDate === 'function') {
    return obj.toDate().toISOString();
  }

  // Handle Firestore DocumentReference (contains circular firebase instance)
  if (typeof obj.path === 'string' && obj.firestore) {
    return obj.path;
  }

  if (Array.isArray(obj)) {
    return obj.map(toPlainObject);
  }

  const plain: any = {};
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      plain[key] = toPlainObject(obj[key]);
    }
  }
  return plain;
}

// Connection test
async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
    console.log('Firebase connected successfully');
  } catch (error) {
    if (error instanceof Error && error.message.includes('offline')) {
      console.error("Firebase connection failed: Client offline or config error.");
    }
  }
}
testConnection();
