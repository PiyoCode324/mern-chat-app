// backend/firebase.js
const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json'); // Firebase からダウンロード

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

module.exports = admin;
