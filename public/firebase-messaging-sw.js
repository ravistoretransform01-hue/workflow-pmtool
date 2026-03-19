importScripts(
  "https://www.gstatic.com/firebasejs/10.0.0/firebase-app-compat.js",
);
importScripts(
  "https://www.gstatic.com/firebasejs/10.0.0/firebase-messaging-compat.js",
);

// Must match firebaseConfig in firebase.ts
firebase.initializeApp({
  apiKey: "AIzaSyBlzc7iOfMtjL2Jgl7VJ_v9oCjOyEYkv-0",
  authDomain: "pm-tool-da7e9.firebaseapp.com",
  projectId: "pm-tool-da7e9",
  storageBucket: "pm-tool-da7e9.firebasestorage.app",
  messagingSenderId: "512660511230",
  appId: "1:512660511230:web:f017be2e8a7486317648af",
});

const messaging = firebase.messaging();

// Handle background / closed-tab notifications
messaging.onBackgroundMessage((payload) => {
  // If the payload has a `notification` field, the browser automatically
  // shows the OS notification — calling showNotification here would duplicate it.
  // Only show manually for data-only payloads (no notification field).
  if (payload.notification) return;

  const title = payload.data?.title || "PM Tool";
  const body = payload.data?.body || "";
  const icon = payload.data?.icon || "/favicon.png";
  const badge = payload.data?.badge || "/favicon.png";

  self.registration.showNotification(title, {
    body,
    icon,
    badge,
  });
});
