// Firebase Configuration (Shared across admin/student)
const FIREBASE_CONFIG = {
    apiKey: "AIzaSyDuoHlw9Op4ZHbSvT3JQfoSWJFa0rjelz4",
    authDomain: "eduanon-835f9.firebaseapp.com",
    projectId: "eduanon-835f9",
    storageBucket: "eduanon-835f9.firebasestorage.app",
    messagingSenderId: "378269868239",
    appId: "1:378269868239:web:951d8ca35fd252313dd7ba"
};

// Backend URLs (GitHub Pages compatible) - UPDATED
const BACKEND_URLS = {
    local: "http://localhost:3000",
    vercel: "https://anon-edu-backend-anon.vercel.app",
    get active() {
        return window.location.hostname.includes('github.io') ? this.vercel : this.local;
    }
};

// Telegram Configuration - UPDATED
const TELEGRAM_CONFIG = {
    bot: "@ANONEDU_Bot",
    publicChannel: "@ANON_EDU",
    privateChannel: "-1003687504990",
    publicLink: "https://t.me/ANON_EDU",
    privateLink: "https://t.me/+oG9POSOSZes3MDJl"
};

// Admin Email
const ADMIN_EMAIL = "bimbadharbaghel0@gmail.com";

// GitHub Pages URL
const GITHUB_PAGES_URL = "https://avirus90.github.io/AnonEdu/";

// Export for use
window.FIREBASE_CONFIG = FIREBASE_CONFIG;
window.BACKEND_URLS = BACKEND_URLS;
window.TELEGRAM_CONFIG = TELEGRAM_CONFIG;
window.ADMIN_EMAIL = ADMIN_EMAIL;
window.GITHUB_PAGES_URL = GITHUB_PAGES_URL;

// Alias for backward compatibility
window.BACKEND_URL = BACKEND_URLS.active;
