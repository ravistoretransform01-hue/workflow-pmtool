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

// DEBUG: Listen for raw push events to see if browser is receiving ANY signal
// self.addEventListener("push", (event) => {
//   console.log("[Service Worker] Raw Push RECEIVED:", event.data?.text());
// });

  // Handle background / closed-tab notifications
messaging.onBackgroundMessage((payload) => {
  // console.log("[Service Worker] Background Message received:", payload);

  // If the server sends a 'notification' block, the browser shows its own notification.
  // We can't easily override that with the favicon unless the server is changed.
  // However, for data-only messages, we will force the favicon here.
  if (payload.notification) return;

  const title = payload.data?.title || "PM Tool";
  const body = payload.data?.message || "";
  const icon = payload.data?.icon || "/favicon.png";
  const badge = payload.data?.badge || "/favicon.png";
  const url = payload.data?.url || "/";

  const notificationOptions = {
    body: body,
    icon: icon,
    badge: badge,
    data: { 
      url: payload.data?.url || "/" 
    },
    tag: 'pm-tool-notif',
    renotify: true
  };

  self.registration.showNotification(title, notificationOptions);
});

// Force service worker to update immediately
self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(clients.claim());
});

// Handle notification click

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  let urlToOpen = "/";

  // ✅ Case 1: Your custom data
  if (event.notification.data?.url) {
    urlToOpen = event.notification.data.url;
  }

  // ✅ Case 2: FCM wrapped data
  else if (event.notification.data?.FCM_MSG?.data?.url) {
    urlToOpen = event.notification.data.FCM_MSG.data.url;
  }

  // ✅ Case 3: notification click_action (if used)
  else if (event.notification.data?.click_action) {
    urlToOpen = event.notification.data.click_action;
  }

  const targetUrl = new URL(urlToOpen, self.location.origin).href;

  event.waitUntil(
    clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clientsArr) => {
        for (const client of clientsArr) {
          if (client.url.includes(self.location.origin) && "focus" in client) {
            client.focus();
            return client.navigate(targetUrl);
          }
        }
        return clients.openWindow(targetUrl);
      }),
  );
});
