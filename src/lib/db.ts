import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore, doc, getDoc, setDoc, collection, getDocs } from 'firebase/firestore';
import { getStorage, ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { createClient } from '@libsql/client/web';

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

let app: any = null;
let auth: any = null;
let firestore: any = null;
let storage: any = null;

if (isFirebaseConfigured) {
  try {
    app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
    auth = getAuth(app);
    firestore = getFirestore(app);
    storage = getStorage(app);
  } catch (error) {
    console.warn("Firebase failed to initialize:", error);
  }
}

// Turso Connection configuration
const tursoUrl = process.env.NEXT_PUBLIC_TURSO_DATABASE_URL || "";
const tursoToken = process.env.NEXT_PUBLIC_TURSO_AUTH_TOKEN || "";
const isTursoConfigured = !!(tursoUrl && tursoToken);

let tursoClient: any = null;
if (isTursoConfigured) {
  try {
    tursoClient = createClient({
      url: tursoUrl,
      authToken: tursoToken
    });
  } catch (e) {
    console.warn("Turso client failed to initialize:", e);
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
  key: string;
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

export interface Coordinator {
  name: string;
  role: string;
  phone: string;
  initials: string;
}

export interface CoordinatorsData {
  faculty: Coordinator[];
  student: Coordinator[];
}

const defaultCoordinators: CoordinatorsData = {
  faculty: [
    { name: 'Dr. K. Sirisha', role: 'Faculty Coordinator', phone: '8688753830', initials: 'KS' },
    { name: 'Ms. Ch. Meenakshi', role: 'Faculty Coordinator', phone: '7075739689', initials: 'CM' }
  ],
  student: [
    { name: 'M. Rohith Sai', role: 'Student Coordinator', phone: '9014123748', initials: 'MR' },
    { name: 'N. Govardhan', role: 'Student Coordinator', phone: '9030536726', initials: 'NG' },
    { name: 'M. Kotesh', role: 'Student Coordinator', phone: '9908474421', initials: 'MK' }
  ]
};

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

  async getWinners(): Promise<Winner[]> {
    return this.getStorageItem<Winner[]>('ll_winners', []);
  }

  async saveWinners(winners: Winner[]): Promise<void> {
    this.setStorageItem('ll_winners', winners);
  }

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

  async getCoordinators(): Promise<CoordinatorsData> {
    return this.getStorageItem<CoordinatorsData>('ll_coordinators', defaultCoordinators);
  }

  async saveCoordinators(coords: CoordinatorsData): Promise<void> {
    this.setStorageItem('ll_coordinators', coords);
  }
}

const localDb = new LocalDb();

// Lazy database tables migration execution
let schemaInitialized = false;
async function initTursoSchema() {
  if (!tursoClient || schemaInitialized) return;
  try {
    await tursoClient.execute(`
      CREATE TABLE IF NOT EXISTS submissions (
        id TEXT PRIMARY KEY,
        teamName TEXT NOT NULL,
        participationType TEXT NOT NULL,
        member1Name TEXT NOT NULL,
        member1Roll TEXT NOT NULL,
        member1Email TEXT NOT NULL,
        member1Phone TEXT NOT NULL,
        member2Name TEXT,
        member2Roll TEXT,
        member2Email TEXT,
        member2Phone TEXT,
        photoUrl TEXT,
        reelUrl TEXT,
        paymentScreenshotUrl TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'pending',
        submittedAt TEXT NOT NULL
      )
    `);
    await tursoClient.execute(`
      CREATE TABLE IF NOT EXISTS winners (
        key TEXT PRIMARY KEY,
        label TEXT NOT NULL,
        submissionId TEXT NOT NULL,
        name TEXT NOT NULL,
        branch TEXT NOT NULL,
        category TEXT NOT NULL,
        fileUrl TEXT,
        caption TEXT
      )
    `);
    await tursoClient.execute(`
      CREATE TABLE IF NOT EXISTS config (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL
      )
    `);
    schemaInitialized = true;
  } catch (e) {
    console.error("Failed to run Turso migrations:", e);
  }
}

// Unified API Wrapper (Automatically routes to Turso, Firebase, or LocalStorage)
export const db = {
  isFirebaseActive(): boolean {
    return !!(isFirebaseConfigured && app && firestore);
  },

  isTursoActive(): boolean {
    return !!(isTursoConfigured && tursoClient);
  },

  // Submissions APIS
  async getSubmissions(): Promise<Submission[]> {
    if (db.isTursoActive()) {
      try {
        await initTursoSchema();
        const res = await tursoClient.execute("SELECT * FROM submissions ORDER BY submittedAt DESC");
        return res.rows.map((row: any) => ({
          id: row.id,
          teamName: row.teamName,
          participationType: row.participationType,
          member1Name: row.member1Name,
          member1Roll: row.member1Roll,
          member1Email: row.member1Email,
          member1Phone: row.member1Phone,
          member2Name: row.member2Name || undefined,
          member2Roll: row.member2Roll || undefined,
          member2Email: row.member2Email || undefined,
          member2Phone: row.member2Phone || undefined,
          photoUrl: row.photoUrl || undefined,
          reelUrl: row.reelUrl || undefined,
          paymentScreenshotUrl: row.paymentScreenshotUrl,
          status: row.status,
          submittedAt: row.submittedAt
        } as Submission));
      } catch (e) {
        console.error("Turso getSubmissions failed, using LocalStorage fallback:", e);
        return localDb.getSubmissions();
      }
    } else if (db.isFirebaseActive()) {
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
    if (db.isTursoActive()) {
      try {
        await initTursoSchema();
        await tursoClient.execute({
          sql: `INSERT OR REPLACE INTO submissions (
            id, teamName, participationType, member1Name, member1Roll, member1Email, member1Phone,
            member2Name, member2Roll, member2Email, member2Phone, photoUrl, reelUrl, paymentScreenshotUrl, status, submittedAt
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          args: [
            sub.id, sub.teamName, sub.participationType, sub.member1Name, sub.member1Roll, sub.member1Email, sub.member1Phone,
            sub.member2Name || null, sub.member2Roll || null, sub.member2Email || null, sub.member2Phone || null,
            sub.photoUrl || null, sub.reelUrl || null, sub.paymentScreenshotUrl, sub.status, sub.submittedAt
          ]
        });
      } catch (e) {
        console.error("Turso saveSubmission failed, using LocalStorage fallback:", e);
        await localDb.saveSubmission(sub);
      }
    } else if (db.isFirebaseActive()) {
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
    if (db.isTursoActive()) {
      try {
        await initTursoSchema();
        await tursoClient.execute({
          sql: "DELETE FROM submissions WHERE id = ?",
          args: [id]
        });
      } catch (e) {
        await localDb.deleteSubmission(id);
      }
    } else if (db.isFirebaseActive()) {
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
    if (db.isTursoActive()) {
      try {
        await initTursoSchema();
        const res = await tursoClient.execute("SELECT * FROM winners");
        return res.rows.map((row: any) => ({
          key: row.key,
          label: row.label,
          submissionId: row.submissionId,
          name: row.name,
          branch: row.branch,
          category: row.category,
          fileUrl: row.fileUrl || undefined,
          caption: row.caption || undefined
        } as Winner));
      } catch (e) {
        return localDb.getWinners();
      }
    } else if (db.isFirebaseActive()) {
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
    if (db.isTursoActive()) {
      try {
        await initTursoSchema();
        await tursoClient.execute("DELETE FROM winners");
        for (const w of winners) {
          await tursoClient.execute({
            sql: "INSERT OR REPLACE INTO winners (key, label, submissionId, name, branch, category, fileUrl, caption) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
            args: [w.key, w.label, w.submissionId, w.name, w.branch, w.category, w.fileUrl || null, w.caption || null]
          });
        }
      } catch (e) {
        await localDb.saveWinners(winners);
      }
    } else if (db.isFirebaseActive()) {
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
    if (db.isTursoActive()) {
      try {
        await initTursoSchema();
        const res = await tursoClient.execute({
          sql: "SELECT value FROM config WHERE key = ?",
          args: ["settings"]
        });
        if (res.rows.length > 0) {
          return JSON.parse(res.rows[0].value as string) as DynamicSettings;
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
    } else if (db.isFirebaseActive()) {
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
    if (db.isTursoActive()) {
      try {
        await initTursoSchema();
        await tursoClient.execute({
          sql: "INSERT OR REPLACE INTO config (key, value) VALUES (?, ?)",
          args: ["settings", JSON.stringify(settings)]
        });
      } catch (e) {
        await localDb.saveSettings(settings);
      }
    } else if (db.isFirebaseActive()) {
      try {
        await setDoc(doc(firestore, "config", "settings"), settings);
      } catch (e) {
        await localDb.saveSettings(settings);
      }
    } else {
      await localDb.saveSettings(settings);
    }
  },

  // Coordinators APIS
  async getCoordinators(): Promise<CoordinatorsData> {
    if (db.isTursoActive()) {
      try {
        await initTursoSchema();
        const res = await tursoClient.execute({
          sql: "SELECT value FROM config WHERE key = ?",
          args: ["coordinators"]
        });
        if (res.rows.length > 0) {
          return JSON.parse(res.rows[0].value as string) as CoordinatorsData;
        }
        return defaultCoordinators;
      } catch (e) {
        return localDb.getCoordinators();
      }
    } else {
      return localDb.getCoordinators();
    }
  },

  async saveCoordinators(coords: CoordinatorsData): Promise<void> {
    if (db.isTursoActive()) {
      try {
        await initTursoSchema();
        await tursoClient.execute({
          sql: "INSERT OR REPLACE INTO config (key, value) VALUES (?, ?)",
          args: ["coordinators", JSON.stringify(coords)]
        });
      } catch (e) {
        await localDb.saveCoordinators(coords);
      }
    } else {
      await localDb.saveCoordinators(coords);
    }
  },

  // Unified Direct Upload API
  async uploadFile(file: File, path: string, onProgress?: (pct: number) => void): Promise<string> {
    if (db.isFirebaseActive() && storage) {
      // Use premium Firebase storage if active
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
      // If using Turso or offline LocalDb: Fallback to direct Base64 string storage
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
