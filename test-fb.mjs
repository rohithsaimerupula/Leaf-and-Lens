import { initializeApp } from "firebase/app";
import { getStorage, ref, uploadString } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyCiYALWnrdf8gKrzMtWmWVBo5iK-9TrK2g",
  authDomain: "afww-d28fc.firebaseapp.com",
  projectId: "afww-d28fc",
  storageBucket: "afww-d28fc.firebasestorage.app",
  messagingSenderId: "79467294495",
  appId: "1:79467294495:web:a06f4a42aa30a39b410a2a"
};

const app = initializeApp(firebaseConfig);
const storage = getStorage(app);
const storageRef = ref(storage, 'test.txt');

console.log("Attempting upload...");
uploadString(storageRef, 'Hello World!').then(() => {
  console.log("Upload successful!");
  process.exit(0);
}).catch((err) => {
  console.error("Upload failed:", err);
  process.exit(1);
});
