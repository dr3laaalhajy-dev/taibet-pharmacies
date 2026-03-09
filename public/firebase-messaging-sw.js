importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "AIzaSyBhqhAyQUsfbyLD98y9vNI1aD5O_eAKHEQ",
  authDomain: "taiba-health.firebaseapp.com",
  projectId: "taiba-health",
  storageBucket: "taiba-health.firebasestorage.app",
  messagingSenderId: "344680335895",
  appId: "1:344680335895:web:1884b4c3abf877054eea52"
});

const messaging = firebase.messaging();

// التعامل مع الإشعارات عندما يكون التطبيق في الخلفية
messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Received background message ', payload);
  const notificationTitle = payload.notification.title;
  const notificationOptions = {
    body: payload.notification.body,
    icon: '/logo.png' // تأكد من وجود أيقونة بهذا الاسم في مجلد public
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});