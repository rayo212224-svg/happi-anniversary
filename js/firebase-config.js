// Firebase Configuration
// นำค่า Config จาก Firebase Console (ขั้นตอน Setup) มาวางแทนที่ค่าจำลองด้านล่างนี้ได้เลยครับ
const firebaseConfig = {
    apiKey: "YOUR_API_KEY",
    authDomain: "YOUR_PROJECT.firebaseapp.com",
    databaseURL: "https://YOUR_PROJECT-default-rtdb.firebaseio.com",
    projectId: "YOUR_PROJECT",
    storageBucket: "YOUR_PROJECT.appspot.com",
    messagingSenderId: "YOUR_SENDER_ID",
    appId: "YOUR_APP_ID"
};

// Initialize Firebase App
firebase.initializeApp(firebaseConfig);

// Get Reference to Realtime Database
const db = firebase.database();