const firebaseConfig = {
  apiKey: "AIzaSyB8LgjaKXhqZffGfNhJX3BYn-sxOb2r7V8",
  authDomain: "noxbuddy-23o11.firebaseapp.com",
  projectId: "noxbuddy-23o11",
  storageBucket: "noxbuddy-23o11.firebasestorage.app",
  messagingSenderId: "1088311396105",
  appId: "1:1088311396105:web:a33e96634f6fcd81a4f5d8",
  measurementId: "G-3GXT9CK2B0"
};

firebase.initializeApp(firebaseConfig);

const auth = firebase.auth();

export { auth };
