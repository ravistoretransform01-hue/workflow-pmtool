import { initializeApp } from "firebase/app";
import {
  getMessaging,
  getToken,
  onMessage,
  isSupported,
  type Messaging,
} from "firebase/messaging";

// don't edit firebaseConfig
const firebaseConfig = {
  apiKey: "AIzaSyBlzc7iOfMtjL2Jgl7VJ_v9oCjOyEYkv-0",
  authDomain: "pm-tool-da7e9.firebaseapp.com",
  projectId: "pm-tool-da7e9",
  storageBucket: "pm-tool-da7e9.firebasestorage.app",
  messagingSenderId: "512660511230",
  appId: "1:512660511230:web:f017be2e8a7486317648af",
};

// ↓ Change this ONE line to enable/disable all Firebase push notifications
const PUSH_NOTIFICATIONS_ENABLED = true;

export const app = initializeApp(firebaseConfig);

// messaging is only available in secure contexts (HTTPS / localhost).
// On local-network IPs (http://192.168.x.x) it will be null.
let messagingInstance: Messaging | null = null;

export const getFirebaseMessaging = async (): Promise<Messaging | null> => {
  if (!PUSH_NOTIFICATIONS_ENABLED) return null;
  if (messagingInstance) return messagingInstance;
  try {
    const supported = await isSupported();
    if (!supported) return null;
    messagingInstance = getMessaging(app);
    return messagingInstance;
  } catch {
    return null;
  }
};

// Re-export onMessage for convenience
export { onMessage };

/**
 * Requests browser notification permission and returns the FCM token.
 * Returns null if unsupported, notification disabled, permission denied, or an error occurs.
 */
export const requestNotificationPermission = async (): Promise<string | null> => {
  if (!PUSH_NOTIFICATIONS_ENABLED) return null;
  try {
    const msg = await getFirebaseMessaging();
    if (!msg) return null;

    const permission = await Notification.requestPermission();
    if (permission !== "granted") return null;

    const token = await getToken(msg, {
      vapidKey:
        "BOziA9MsMKA4KDJ25W7M3VcxwQiCSeTehmY7kCOA8oehEKDuyBP6iAfFf95ZRBHNQstMVtM4YhY7hMJVRClqRjA",
    });

    return token;
  } catch (error) {
    console.error("Notification permission error:", error);
    return null;
  }
};
