/**
 * Import function triggers from their respective submodules:
 *
 * const {onCall} = require("firebase-functions/v2/https");
 * const {onDocumentWritten} = require("firebase-functions/v2/firestore");
 *
 * See a full list of supported triggers at https://firebase.google.com/docs/functions
 */

const { onRequest } = require("firebase-functions/v2/https");
const logger = require("firebase-functions/logger");
const admin = require("firebase-admin");
const functions = require("firebase-functions");
require("dotenv").config();
const serviceAccountKey = require("./serviceAccountKey.json");
// const db = admin.firestore();
const express = require("express");
const app = express();
app.use(express.json());

const cors = require("cors");
app.use(cors({ origin: true }));
app.use((req, res, next) => {
  res.set("Access-Control-Allow-Origin", "*");
  next();
});

admin.initializeApp({
  credential: admin.credential.cert(serviceAccountKey),
});

app.get("/", (req, res) => {
  res.send("hello world");
});

const userRoute = require("./routes/user");
app.use("/api/user", userRoute);
const productRoute = require("./routes/product");
app.use("/api/products", productRoute);

exports.app = functions.https.onRequest(app);
app.get("/*", function (req, res) {
  res.sendFile(
    path.join(__dirname, "../client/build/index.html"),
    function (err) {
      if (err) {
        res.status(500).send(err);
      }
    }
  );
});
// Create and deploy your first functions
// https://firebase.google.com/docs/functions/get-started

// exports.helloWorld = onRequest((request, response) => {
//   logger.info("Hello logs!", {structuredData: true});
//   response.send("Hello from Firebase!");
// });
