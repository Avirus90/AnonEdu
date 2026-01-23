// Authentication System for EduAnon
class EduAuth {
    constructor() {
        this.currentUser = null;
        this.userRole = null;
        this.initFirebase();
        this.setupAuthListeners();
    }
    
    initFirebase() {
        try {
            if (!firebase.apps.length) {
                firebase.initializeApp(FIREBASE_CONFIG);
            }
            console.log('✅ Firebase initialized');
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
                this.redirectBasedOnRole();
            } else {
                console.log('👤 No user logged in');
                this.userRole = null;
                
                // Only redirect if not on landing page
                if (!window.location.pathname.includes('index.html') && 
                    window.location.pathname !== '/') {
                    window.location.href = '../index.html';
                }
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
    
    redirectBasedOnRole() {
        const currentPath = window.location.pathname;
        
        // If user is admin
        if (this.userRole === 'admin') {
            // If not on admin page, redirect to admin
            if (!currentPath.includes('/admin/')) {
                window.location.href = 'admin/index.html';
            }
        } 
        // If user is student
        else if (this.userRole === 'student') {
            // If on admin page, redirect to student
            if (currentPath.includes('/admin/')) {
                window.location.href = '../student/index.html';
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
    auth = new EduAuth();
    window.auth = auth;
});
