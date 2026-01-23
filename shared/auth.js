// Authentication System for EduAnon - FIXED VERSION
class EduAuth {
    constructor() {
        this.currentUser = null;
        this.userRole = null;
        this.initialized = false;
        
        console.log('🔐 Auth system initializing...');
        this.initFirebase();
    }
    
    initFirebase() {
        try {
            if (!firebase.apps.length) {
                firebase.initializeApp(FIREBASE_CONFIG);
            }
            
            this.setupAuthListeners();
            this.initialized = true;
            console.log('✅ Firebase Auth initialized');
            
        } catch (error) {
            console.error('Firebase init error:', error);
        }
    }
    
    setupAuthListeners() {
        firebase.auth().onAuthStateChanged(async (user) => {
            this.currentUser = user;
            
            if (user) {
                console.log('👤 User logged in:', user.email);
                await this.determineUserRole(user);
                this.updateUI();
            } else {
                console.log('👤 No user logged in');
                this.userRole = null;
                this.updateUI();
            }
        });
    }
    
    async determineUserRole(user) {
        if (user.email === ADMIN_EMAIL) {
            this.userRole = 'admin';
        } else {
            this.userRole = 'student';
        }
        console.log('Role determined:', this.userRole);
    }
    
    updateUI() {
        // Update email display if elements exist
        const adminEmailElement = document.getElementById('adminEmail');
        const studentEmailElement = document.getElementById('studentEmail');
        
        if (this.currentUser) {
            if (adminEmailElement) {
                adminEmailElement.textContent = this.currentUser.email;
            }
            if (studentEmailElement) {
                studentEmailElement.textContent = this.currentUser.email;
            }
        }
    }
    
    async loginWithGoogle() {
        try {
            const provider = new firebase.auth.GoogleAuthProvider();
            const result = await firebase.auth().signInWithPopup(provider);
            return { success: true, user: result.user };
        } catch (error) {
            console.error('Login error:', error);
            return { success: false, error: error.message };
        }
    }
    
    async logout() {
        try {
            await firebase.auth().signOut();
            window.location.href = '../index.html';
        } catch (error) {
            console.error('Logout error:', error);
        }
    }
    
    async getToken() {
        if (!this.currentUser) return null;
        return await this.currentUser.getIdToken();
    }
    
    isAdmin() {
        return this.userRole === 'admin' || 
               (this.currentUser && this.currentUser.email === ADMIN_EMAIL);
    }
    
    isStudent() {
        return this.userRole === 'student';
    }
    
    getCurrentUser() {
        return this.currentUser;
    }
    
    getUserRole() {
        return this.userRole;
    }
}

// Initialize when DOM is ready
let auth = null;
document.addEventListener('DOMContentLoaded', function() {
    // Delay initialization to avoid conflicts
    setTimeout(() => {
        if (!window.auth) {
            auth = new EduAuth();
            window.auth = auth;
        }
    }, 1000);
});
