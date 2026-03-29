const admin = require("firebase-admin");
const fs = require("fs");

const serviceAccount = JSON.parse(fs.readFileSync("./firebase-applet-config.json", "utf8"));

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function check() {
  const snapshot = await db.collection("artifacts").doc("tanqueteam-bjj").collection("public").doc("data").collection("students").get();
  snapshot.forEach(doc => {
    console.log(doc.id, doc.data().name, doc.data().plan);
  });
}

check().catch(console.error);
