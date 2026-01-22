// Authentication Utilities for EduAnon Platform
class EduAuth {
    constructor() {
        this.currentUser = null;
        this.userRole = null;
        this.isDemoMode = sessionStorage.getItem('edu_demo_mode') === 'true';
        
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
        if (!firebase.auth) {
            console.error('Firebase Auth not loaded');
            return;
        }
        
        firebase.auth().onAuthStateChanged(async (user) => {
            this.currentUser = user;
            
            if (user) {
                console.log('👤 User logged in:', user.email);
                await this.determineUserRole(user);
                this.applyRoleBasedUI();
            } else {
                console.log('👤 No user logged in');
                this.userRole = null;
                
                if (!this.isDemoMode && 
                    !window.location.pathname.endsWith('index.html') &&
                    !window.location.pathname.endsWith('/')) {
                    window.location.href = 'index.html';
                }
            }
        });
    }
    
    async determineUserRole(user) {
        try {
            const token = await user.getIdToken();
            
            // Try backend first
            const response = await fetch(`${BACKEND_URLS.active}/api/user/role`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            
            if (response.ok) {
                const data = await response.json();
                this.userRole = data.role;
                console.log('Role from backend:', this.userRole);
            } else {
                // Fallback: check email
                this.userRole = user.email === ADMIN_EMAIL ? 'admin' : 'student';
                console.log('Role from email fallback:', this.userRole);
            }
            
            this.applyRoleRestrictions();
            
        } catch (error) {
            console.log('Role determination failed:', error);
            this.userRole = user.email === ADMIN_EMAIL ? 'admin' : 'student';
            this.applyRoleRestrictions();
        }
    }
    
    applyRoleRestrictions() {
        const currentPath = window.location.pathname;
        
        // Student trying to access admin pages
        if (this.userRole === 'student' && currentPath.includes('/admin/')) {
            alert('⚠️ Access Denied: Student cannot access admin panel');
            window.location.href = '../student/index.html';
            return;
        }
        
        // Demo mode restrictions
        if (this.isDemoMode) {
            this.applyDemoRestrictions();
        }
    }
    
    applyRoleBasedUI() {
        const userInfoEl = document.getElementById('userInfo');
        if (userInfoEl && this.currentUser) {
            userInfoEl.innerHTML = `
                <div class="dropdown">
                    <button class="btn btn-outline-secondary btn-sm dropdown-toggle" 
                            type="button" data-bs-toggle="dropdown">
                        <i class="fas fa-user"></i> ${this.currentUser.email}
                    </button>
                    <ul class="dropdown-menu">
                        <li><span class="dropdown-item-text">
                            Role: <span class="badge bg-${this.userRole === 'admin' ? 'success' : 'primary'}">
                                ${this.userRole}
                            </span>
                        </span></li>
                        <li><hr class="dropdown-divider"></li>
                        <li><button class="dropdown-item" onclick="eduAuth.logout()">
                            <i class="fas fa-sign-out-alt"></i> Logout
                        </button></li>
                    </ul>
                </div>
            `;
        }
    }
    
    applyDemoRestrictions() {
        // Show demo banner
        this.showDemoBanner();
        
        // Disable restricted elements
        const disableSelectors = [
            '[data-admin-only]',
            '[data-upload]',
            '[data-delete]',
            '[data-edit]'
        ];
        
        disableSelectors.forEach(selector => {
            document.querySelectorAll(selector).forEach(el => {
                el.style.opacity = '0.5';
                el.style.pointerEvents = 'none';
                el.title = 'Available only after login';
            });
        });
    }
    
    showDemoBanner() {
        if (document.getElementById('demoBanner')) return;
        
        const banner = document.createElement('div');
        banner.id = 'demoBanner';
        banner.className = 'alert alert-warning alert-dismissible fade show mb-0';
        banner.innerHTML = `
            <div class="d-flex justify-content-between align-items-center">
                <div>
                    <strong><i class="fas fa-eye"></i> Demo Mode</strong> 
                    - Limited features. 
                    <a href="index.html" class="alert-link">Login for full access</a>
                </div>
                <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
            </div>
        `;
        document.body.insertBefore(banner, document.body.firstChild);
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
            sessionStorage.removeItem('edu_demo_mode');
            window.location.href = 'index.html';
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
        return this.userRole === 'student' || 
               (this.currentUser && this.currentUser.email !== ADMIN_EMAIL);
    }
    
    getCurrentUser() {
        return this.currentUser;
    }
    
    getUserRole() {
        return this.userRole;
    }
}

// Initialize when DOM is ready
let eduAuth = null;
document.addEventListener('DOMContentLoaded', function() {
    eduAuth = new EduAuth();
    window.eduAuth = eduAuth;
    window.auth = eduAuth; // Alias for compatibility
});
