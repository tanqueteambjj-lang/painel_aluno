import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, query, where } from "firebase/firestore";

const firebaseConfig = {
    apiKey: "AIzaSyCWlrrfNn6q4GhhL2H7goHjQMd3MsprxOE",
    authDomain: "tanqueteambjj.firebaseapp.com",
    projectId: "tanqueteambjj"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function run() {
  const q = query(collection(db, 'artifacts', 'tanqueteam-bjj', 'public', 'data', 'students'));
  const snap = await getDocs(q);
  snap.forEach(doc => {
    if (doc.data().name && doc.data().name.toUpperCase().includes('LEONARDO SALES')) {
      console.log(doc.id, "=>", doc.data());
    }
  });
  process.exit(0);
}
run();
