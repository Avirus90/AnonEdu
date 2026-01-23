// Firebase Configuration (Shared across admin/student)
const FIREBASE_CONFIG = {
    apiKey: "AIzaSyDuoHlw9Op4ZHbSvT3JQfoSWJFa0rjelz4",
    authDomain: "eduanon-835f9.firebaseapp.com",
    projectId: "eduanon-835f9",
    storageBucket: "eduanon-835f9.firebasestorage.app",
    messagingSenderId: "378269868239",
    appId: "1:378269868239:web:951d8ca35fd252313dd7ba"
};

// Backend URLs
const BACKEND_URLS = {
    local: "http://localhost:3000",
    vercel: "https://anon-edu-backend-anon.vercel.app",
    get active() {
        return this.vercel; // Always use Vercel for now
    }
};

// Telegram Configuration
const TELEGRAM_CONFIG = {
    botToken: "8151664879:AAGggzn4M2Iv-9lHAUJXjCVPGKnKyr7IZMc",
    botUsername: "@ANONEDU_Bot",
    publicChannel: "@ANON_EDU",
    publicChannelId: "-1003687504990",
    publicLink: "https://t.me/ANON_EDU"
};

// Admin Email
const ADMIN_EMAIL = "bimbadharbaghel0@gmail.com";

// Export for use
window.FIREBASE_CONFIG = FIREBASE_CONFIG;
window.BACKEND_URL = BACKEND_URLS.active;
window.TELEGRAM_CONFIG = TELEGRAM_CONFIG;
window.ADMIN_EMAIL = ADMIN_EMAIL;

console.log('📡 Config loaded:', { 
    backend: BACKEND_URLS.active,
    channel: TELEGRAM_CONFIG.publicChannel 
});
