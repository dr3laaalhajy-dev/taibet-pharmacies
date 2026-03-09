import { initializeApp } from "firebase/app";
import { getMessaging, getToken, onMessage } from "firebase/messaging";

// إعدادات مشروعك التي أرسلتها لي سابقاً
const firebaseConfig = {
  apiKey: "AIzaSyBhqhAyQUsfbyLD98y9vNI1aD5O_eAKHEQ",
  authDomain: "taiba-health.firebaseapp.com",
  projectId: "taiba-health",
  storageBucket: "taiba-health.firebasestorage.app",
  messagingSenderId: "344680335895",
  appId: "1:344680335895:web:1884b4c3abf877054eea52",
  measurementId: "G-0GYSTXR4YR"
};

const app = initializeApp(firebaseConfig);
export const messaging = getMessaging(app);

// 🟢 دالة طلب الإذن من المستخدم واستخراج التوكن
export const requestForToken = async () => {
  try {
    const permission = await Notification.requestPermission();
    if (permission === "granted") {
      const currentToken = await getToken(messaging, { 
        // 👇 ضع مفتاح VAPID الذي نسخته هنا بين علامتي التنصيص
        vapidKey: "BLOkP6FjwKpiFFuvdUYGO_vieKrhVG3KRaPPM0EqAOwlgIctrZOV9dZUapLEbvnNR2yz6vKhiPVYBOLskjTLx5k" 
      });
      if (currentToken) {
        return currentToken;
      }
    } else {
      console.log("تم رفض صلاحية الإشعارات.");
    }
  } catch (err) {
    console.error("حدث خطأ أثناء جلب التوكن: ", err);
  }
  return null;
};

// 🟢 دالة لاستقبال الإشعارات والتطبيق مفتوح (Foreground)
export const onMessageListener = () =>
  new Promise((resolve) => {
    onMessage(messaging, (payload) => {
      resolve(payload);
    });
  });