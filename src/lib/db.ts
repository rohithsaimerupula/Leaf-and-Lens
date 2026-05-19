import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore, doc, getDoc, setDoc, collection, getDocs, updateDoc } from 'firebase/firestore';
import { getStorage, ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';

// Default mock Firebase config (users can replace this via .env or directly)
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || ""
};

// Check if Firebase config is fully loaded/configured
const isFirebaseConfigured = !!(
  firebaseConfig.apiKey &&
  firebaseConfig.projectId &&
  firebaseConfig.storageBucket
);

let app: any;
let auth: any;
let firestore: any;
let storage: any;

if (isFirebaseConfigured) {
  try {
    app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
    auth = getAuth(app);
    firestore = getFirestore(app);
    storage = getStorage(app);
  } catch (error) {
    console.warn("Firebase failed to initialize, falling back to LocalStorage engine:", error);
    app = null;
  }
}

export { auth, firestore, storage };

// Unified Data Schema interfaces
export interface Submission {
  id: string;
  teamName: string;
  participationType: 'Photo' | 'Reel' | 'Both';
  member1Name: string;
  member1Roll: string;
  member1Email: string;
  member1Phone: string;
  member2Name?: string;
  member2Roll?: string;
  member2Email?: string;
  member2Phone?: string;
  photoUrl?: string;
  reelUrl?: string;
  paymentScreenshotUrl: string;
  status: 'pending' | 'approved' | 'rejected';
  submittedAt: string;
}

export interface Winner {
  key: string; // e.g. photo_1st, reel_1st
  label: string;
  submissionId: string;
  name: string;
  branch: string;
  category: string;
  fileUrl?: string;
  caption?: string;
}

export interface DynamicSettings {
  regStartDate: string;
  regEndDate: string;
  resultsPublic: boolean;
  resultDate: string;
}

// LocalStorage Mock engine (for seamless out-of-the-box operation)
class LocalDb {
  private getStorageItem<T>(key: string, defaultValue: T): T {
    if (typeof window === 'undefined') return defaultValue;
    const val = localStorage.getItem(key);
    return val ? JSON.parse(val) : defaultValue;
  }

  private setStorageItem<T>(key: string, value: T): void {
    if (typeof window === 'undefined') return;
    localStorage.setItem(key, JSON.stringify(value));
  }

  // Submissions
  async getSubmissions(): Promise<Submission[]> {
    return this.getStorageItem<Submission[]>('ll_submissions', []);
  }

  async saveSubmission(sub: Submission): Promise<void> {
    const subs = await this.getSubmissions();
    const existingIdx = subs.findIndex(s => s.id === sub.id);
    if (existingIdx > -1) {
      subs[existingIdx] = sub;
    } else {
      subs.push(sub);
    }
    this.setStorageItem('ll_submissions', subs);
  }

  async deleteSubmission(id: string): Promise<void> {
    const subs = await this.getSubmissions();
    const filtered = subs.filter(s => s.id !== id);
    this.setStorageItem('ll_submissions', filtered);
  }

  // Winners
  async getWinners(): Promise<Winner[]> {
    return this.getStorageItem<Winner[]>('ll_winners', []);
  }

  async saveWinners(winners: Winner[]): Promise<void> {
    this.setStorageItem('ll_winners', winners);
  }

  // Settings
  async getSettings(): Promise<DynamicSettings> {
    return this.getStorageItem<DynamicSettings>('ll_settings', {
      regStartDate: "2026-05-20",
      regEndDate: "2026-05-26",
      resultsPublic: false,
      resultDate: "2026-06-05"
    });
  }

  async saveSettings(settings: DynamicSettings): Promise<void> {
    this.setStorageItem('ll_settings', settings);
  }
}

const localDb = new LocalDb();

// Unified API Wrapper (Automatically routes to Firebase if active, else LocalStorage)
export const db = {
  // Check engine
  isFirebaseActive(): boolean {
    return !!(isFirebaseConfigured && app && firestore);
  },

  // Submissions APIS
  async getSubmissions(): Promise<Submission[]> {
    if (db.isFirebaseActive()) {
      try {
        const querySnapshot = await getDocs(collection(firestore, "submissions"));
        const subs: Submission[] = [];
        querySnapshot.forEach((doc) => {
          subs.push({ id: doc.id, ...doc.data() } as Submission);
        });
        return subs;
      } catch (e) {
        console.error("Firebase getSubmissions failed, using LocalStorage fallback:", e);
        return localDb.getSubmissions();
      }
    } else {
      return localDb.getSubmissions();
    }
  },

  async saveSubmission(sub: Submission): Promise<void> {
    if (db.isFirebaseActive()) {
      try {
        await setDoc(doc(firestore, "submissions", sub.id), sub);
      } catch (e) {
        console.error("Firebase saveSubmission failed, using LocalStorage fallback:", e);
        await localDb.saveSubmission(sub);
      }
    } else {
      await localDb.saveSubmission(sub);
    }
  },

  async deleteSubmission(id: string): Promise<void> {
    if (db.isFirebaseActive()) {
      // Firebase delete is not heavily required for clients but can be standard
      try {
        const { deleteDoc } = await import('firebase/firestore');
        await deleteDoc(doc(firestore, "submissions", id));
      } catch (e) {
        await localDb.deleteSubmission(id);
      }
    } else {
      await localDb.deleteSubmission(id);
    }
  },

  // Winners APIS
  async getWinners(): Promise<Winner[]> {
    if (db.isFirebaseActive()) {
      try {
        const docRef = doc(firestore, "results", "winners");
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          return docSnap.data().list as Winner[];
        }
        return [];
      } catch (e) {
        return localDb.getWinners();
      }
    } else {
      return localDb.getWinners();
    }
  },

  async saveWinners(winners: Winner[]): Promise<void> {
    if (db.isFirebaseActive()) {
      try {
        await setDoc(doc(firestore, "results", "winners"), { list: winners });
      } catch (e) {
        await localDb.saveWinners(winners);
      }
    } else {
      await localDb.saveWinners(winners);
    }
  },

  // Settings APIS
  async getSettings(): Promise<DynamicSettings> {
    if (db.isFirebaseActive()) {
      try {
        const docRef = doc(firestore, "config", "settings");
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          return docSnap.data() as DynamicSettings;
        }
        return {
          regStartDate: "2026-05-20",
          regEndDate: "2026-05-26",
          resultsPublic: false,
          resultDate: "2026-06-05"
        };
      } catch (e) {
        return localDb.getSettings();
      }
    } else {
      return localDb.getSettings();
    }
  },

  async saveSettings(settings: DynamicSettings): Promise<void> {
    if (db.isFirebaseActive()) {
      try {
        await setDoc(doc(firestore, "config", "settings"), settings);
      } catch (e) {
        await localDb.saveSettings(settings);
      }
    } else {
      await localDb.saveSettings(settings);
    }
  },

  // Unified Direct Upload API
  async uploadFile(file: File, path: string, onProgress?: (pct: number) => void): Promise<string> {
    if (db.isFirebaseActive() && storage) {
      return new Promise((resolve, reject) => {
        const storageRef = ref(storage, `${path}/${Date.now()}_${file.name}`);
        const uploadTask = uploadBytesResumable(storageRef, file);

        uploadTask.on('state_changed', 
          (snapshot) => {
            const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
            if (onProgress) onProgress(progress);
          }, 
          (error) => {
            console.error("Firebase Storage upload error, falling back to Local Base64:", error);
            db.fallbackBase64(file).then(resolve).catch(reject);
          }, 
          () => {
            getDownloadURL(uploadTask.snapshot.ref).then((downloadURL) => {
              resolve(downloadURL);
            });
          }
        );
      });
    } else {
      // Offline fallback: Convert file to Base64 dataURL (instant client-side offline mock simulation)
      return db.fallbackBase64(file);
    }
  },

  fallbackBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = error => reject(error);
    });
  }
};
