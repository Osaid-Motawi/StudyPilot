import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';

// Non-secret client config (Auth only). Firestore is NEVER accessed from the
// frontend — per the constitution the frontend uses Firebase Auth solely to
// obtain an ID token it sends to the backend.
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export default app;
