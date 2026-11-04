/* =====================================================================
   إعدادات قاعدة البيانات (Firebase)
   ---------------------------------------------------------------------
   1) أنشئ مشروعًا على https://console.firebase.google.com
   2) Project settings → Your apps → Web app → انسخ firebaseConfig هنا
   3) فعّل: Authentication (Email/Password) + Firestore + Storage
   4) اكتب بريد المشرف في adminEmails (ونفس البريد في ملف القواعد firestore.rules)
   لو تركت apiKey فارغًا ستعمل المنصة في «وضع تجريبي» يحفظ على الجهاز فقط.
   ===================================================================== */
window.FIREBASE_CONFIG = {
  apiKey: "AIzaSyCKb4quwpFJFpF9LQcfnjqoXuGm9zZLu18",
  authDomain: "reading-a40c1.firebaseapp.com",
  projectId: "reading-a40c1",
  storageBucket: "reading-a40c1.firebasestorage.app",
  messagingSenderId: "685363152984",
  appId: "1:685363152984:web:bf9a52fb82449b7bcae22d"
};

window.FL_SETTINGS = {
  // بريد/بُرد المشرفين (الباحثة / المعلمة) — يُنشأ الحساب من Firebase Console → Authentication
  adminEmails: ["hind@gmail.com"],
  // نطاق وهمي تُبنى عليه حسابات الطلاب: اسم المستخدم + هذا النطاق (لا يحتاج الطالب بريدًا حقيقيًا)
  studentEmailDomain: "students.flipped-learning.app"
};
