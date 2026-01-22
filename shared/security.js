// Security Hardening for EduAnon Platform
class SecuritySystem {
    constructor() {
        this.antiDownloadEnabled = true;
        this.routeProtectionEnabled = true;
        this.abuseDetectionEnabled = true;
        this.failedAttempts = {};
        this.maxFailedAttempts = 5;
        this.lockoutTime = 15 * 60 * 1000; // 15 minutes
        
        this.initSecurity();
    }
    
    initSecurity() {
        // Apply security measures
        this.disableRightClick();
        this.disableKeyboardShortcuts();
        this.preventDragAndDrop();
        this.addContentProtection();
        this.setupRouteGuards();
        this.setupActivityMonitor();
        
        console.log('🔒 Security System Initialized');
    }
    
    // ==================== ANTI-DOWNLOAD PROTECTION ====================
    
    disableRightClick() {
        document.addEventListener('contextmenu', (e) => {
            if (this.antiDownloadEnabled) {
                e.preventDefault();
                this.showSecurityWarning('Right-click is disabled to prevent downloads');
                return false;
            }
        });
    }
    
    disableKeyboardShortcuts() {
        const blockedShortcuts = [
            { keys: ['ctrl', 's'], description: 'Save page' },
            { keys: ['ctrl', 'p'], description: 'Print' },
            { keys: ['ctrl', 'u'], description: 'View source' },
            { keys: ['f12'], description: 'Developer tools' },
            { keys: ['ctrl', 'shift', 'i'], description: 'Inspect element' },
            { keys: ['ctrl', 'shift', 'c'], description: 'Inspect element' }
        ];
        
        document.addEventListener('keydown', (e) => {
            const key = e.key.toLowerCase();
            const ctrlPressed = e.ctrlKey || e.metaKey;
            const shiftPressed = e.shiftKey;
            
            blockedShortcuts.forEach(shortcut => {
                let match = true;
                
                if (shortcut.keys.includes('ctrl') && !ctrlPressed) match = false;
                if (shortcut.keys.includes('shift') && !shiftPressed) match = false;
                if (!shortcut.keys.includes(key) && !shortcut.keys.includes('ctrl') && !shortcut.keys.includes('shift')) match = false;
                
                if (match && this.antiDownloadEnabled) {
                    e.preventDefault();
                    e.stopPropagation();
                    this.showSecurityWarning(`${shortcut.description} is disabled`);
                    return false;
                }
            });
            
            // Block F12
            if (key === 'f12' && this.antiDownloadEnabled) {
                e.preventDefault();
                return false;
            }
        });
    }
    
    preventDragAndDrop() {
        document.addEventListener('dragstart', (e) => {
            if (this.antiDownloadEnabled && 
                (e.target.tagName === 'IMG' || e.target.tagName === 'VIDEO')) {
                e.preventDefault();
                this.showSecurityWarning('Dragging media files is disabled');
                return false;
            }
        });
        
        document.addEventListener('drop', (e) => {
            if (this.antiDownloadEnabled) {
                e.preventDefault();
                return false;
            }
        });
        
        document.addEventListener('dragover', (e) => {
            if (this.antiDownloadEnabled) {
                e.preventDefault();
                return false;
            }
        });
    }
    
    addContentProtection() {
        // Add CSS to prevent text selection
        const style = document.createElement('style');
        style.textContent = `
            .protected-content {
                user-select: none !important;
                -webkit-user-select: none !important;
                -moz-user-select: none !important;
                -ms-user-select: none !important;
            }
            
            .no-download video::-webkit-media-controls {
                -webkit-box-align: start !important;
                -webkit-justify-content: flex-start !important;
            }
            
            .no-download video::-webkit-media-controls-enclosure {
                overflow: hidden !important;
            }
            
            .no-download video::-webkit-media-controls-panel {
                width: calc(100% - 30px) !important;
            }
            
            /* Hide download button in video controls */
            video::-internal-media-controls-download-button {
                display: none !important;
            }
            
            video::-webkit-media-controls-enclosure {
                overflow: hidden;
            }
            
            video::-webkit-media-controls-panel {
                width: calc(100% + 30px);
            }
        `;
        document.head.appendChild(style);
        
        // Apply protection to all media elements
        setTimeout(() => {
            document.querySelectorAll('img, video, iframe').forEach(el => {
                el.classList.add('protected-content', 'no-download');
                
                // Add overlay for images
                if (el.tagName === 'IMG') {
                    this.addImageOverlay(el);
                }
            });
            
            // Apply to all text content (except inputs)
            document.querySelectorAll('body *:not(input):not(textarea):not(button)').forEach(el => {
                el.classList.add('protected-content');
            });
        }, 1000);
    }
    
    addImageOverlay(imgElement) {
        const container = imgElement.parentElement;
        if (!container || container.classList.contains('protected-image-container')) return;
        
        const overlay = document.createElement('div');
        overlay.className = 'image-protection-overlay';
        overlay.style.cssText = `
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: transparent;
            z-index: 100;
            cursor: default;
        `;
        
        const wrapper = document.createElement('div');
        wrapper.className = 'protected-image-container';
        wrapper.style.cssText = `
            position: relative;
            display: inline-block;
        `;
        
        imgElement.parentNode.insertBefore(wrapper, imgElement);
        wrapper.appendChild(imgElement);
        wrapper.appendChild(overlay);
    }
    
    // ==================== ROUTE GUARDS ====================
    
    setupRouteGuards() {
        if (!this.routeProtectionEnabled) return;
        
        // Protect against direct file access
        this.protectDirectFileAccess();
        
        // Protect admin routes
        this.protectAdminRoutes();
        
        // Protect student routes
        this.protectStudentRoutes();
        
        // Session timeout
        this.setupSessionTimeout();
    }
    
    protectDirectFileAccess() {
        // Block common file extensions
        const blockedExtensions = ['.php', '.asp', '.aspx', '.jsp', '.py', '.rb', '.pl', '.cgi', '.sh'];
        
        window.addEventListener('beforeunload', (e) => {
            const url = window.location.href.toLowerCase();
            
            blockedExtensions.forEach(ext => {
                if (url.includes(ext)) {
                    e.preventDefault();
                    window.location.href = '/index.html';
                    return false;
                }
            });
        });
    }
    
    protectAdminRoutes() {
        const currentPath = window.location.pathname;
        
        if (currentPath.includes('/admin/')) {
            // Check if user is authenticated and is admin
            const checkAdminAccess = () => {
                if (!auth || !auth.currentUser) {
                    window.location.href = '../index.html';
                    return false;
                }
                
                if (auth.currentUser.email !== ADMIN_EMAIL) {
                    this.logSecurityEvent('UNAUTHORIZED_ADMIN_ACCESS', {
                        email: auth.currentUser.email,
                        path: currentPath,
                        timestamp: new Date().toISOString()
                    });
                    
                    alert('Access Denied: Admin privileges required');
                    auth.logout();
                    return false;
                }
                
                return true;
            };
            
            // Initial check
            if (!checkAdminAccess()) return;
            
            // Periodic check every 30 seconds
            setInterval(checkAdminAccess, 30000);
        }
    }
    
    protectStudentRoutes() {
        const currentPath = window.location.pathname;
        
        if (currentPath.includes('/student/') && 
            !currentPath.endsWith('index.html') &&
            !currentPath.endsWith('test.html') &&
            !currentPath.endsWith('live.html')) {
            
            // Check if user is authenticated or in demo mode
            const checkStudentAccess = () => {
                const isDemo = sessionStorage.getItem('edu_demo_mode') === 'true';
                
                if (!auth || (!auth.currentUser && !isDemo)) {
                    window.location.href = '../index.html';
                    return false;
                }
                
                // Prevent admin from accessing certain student features
                if (auth.currentUser && auth.currentUser.email === ADMIN_EMAIL) {
                    // Allow admin to view but log it
                    this.logSecurityEvent('ADMIN_VIEWING_STUDENT', {
                        email: auth.currentUser.email,
                        path: currentPath,
                        timestamp: new Date().toISOString()
                    });
                }
                
                return true;
            };
            
            // Initial check
            if (!checkStudentAccess()) return;
            
            // Periodic check
            setInterval(checkStudentAccess, 30000);
        }
    }
    
    setupSessionTimeout() {
        let timeout;
        const timeoutDuration = 30 * 60 * 1000; // 30 minutes
        
        const resetTimer = () => {
            clearTimeout(timeout);
            timeout = setTimeout(() => {
                this.handleSessionTimeout();
            }, timeoutDuration);
        };
        
        // Reset on user activity
        ['click', 'mousemove', 'keypress', 'scroll', 'touchstart'].forEach(event => {
            document.addEventListener(event, resetTimer);
        });
        
        resetTimer();
    }
    
    handleSessionTimeout() {
        if (auth && auth.currentUser) {
            this.logSecurityEvent('SESSION_TIMEOUT', {
                email: auth.currentUser.email,
                timestamp: new Date().toISOString()
            });
            
            if (confirm('Your session has expired due to inactivity. Click OK to logout.')) {
                auth.logout();
            } else {
                auth.logout();
            }
        }
    }
    
    // ==================== ABUSE PREVENTION ====================
    
    setupActivityMonitor() {
        if (!this.abuseDetectionEnabled) return;
        
        // Track rapid clicks (potential bot activity)
        let clickCount = 0;
        let lastClickTime = 0;
        
        document.addEventListener('click', (e) => {
            const now = Date.now();
            const timeDiff = now - lastClickTime;
            
            if (timeDiff < 100) { // Less than 100ms between clicks
                clickCount++;
                
                if (clickCount > 10) { // More than 10 rapid clicks
                    this.detectAbuse('RAPID_CLICKING', {
                        count: clickCount,
                        element: e.target.tagName,
                        timestamp: new Date().toISOString()
                    });
                    
                    // Slow down the user
                    this.throttleUser();
                    clickCount = 0;
                }
            } else {
                clickCount = 0;
            }
            
            lastClickTime = now;
        });
        
        // Track form submissions
        document.addEventListener('submit', (e) => {
            const formId = e.target.id || 'unknown_form';
            this.trackFormSubmission(formId);
        });
        
        // Track API calls
        this.monitorAPICalls();
    }
    
    monitorAPICalls() {
        const originalFetch = window.fetch;
        
        window.fetch = async function(...args) {
            const url = args[0];
            const options = args[1] || {};
            
            // Log API calls (except Firebase calls)
            if (typeof url === 'string' && 
                !url.includes('firebase') && 
                !url.includes('googleapis')) {
                
                window.security?.logSecurityEvent('API_CALL', {
                    url: url,
                    method: options.method || 'GET',
                    timestamp: new Date().toISOString()
                });
                
                // Rate limiting check
                const key = `api_call_${url}`;
                if (!window.security?.checkRateLimit(key, 10, 60000)) { // 10 calls per minute
                    throw new Error('Rate limit exceeded. Please try again later.');
                }
            }
            
            return originalFetch.apply(this, args);
        };
    }
    
    trackFormSubmission(formId) {
        const key = `form_submit_${formId}`;
        const now = Date.now();
        
        if (!this.failedAttempts[key]) {
            this.failedAttempts[key] = {
                count: 0,
                lastAttempt: 0,
                lockedUntil: 0
            };
        }
        
        const formData = this.failedAttempts[key];
        
        // Check if locked
        if (now < formData.lockedUntil) {
            const remainingTime = Math.ceil((formData.lockedUntil - now) / 1000);
            throw new Error(`Too many attempts. Try again in ${remainingTime} seconds.`);
        }
        
        // Check rate limit
        const timeWindow = 5 * 60 * 1000; // 5 minutes
        if (now - formData.lastAttempt < timeWindow) {
            formData.count++;
        } else {
            formData.count = 1;
        }
        
        formData.lastAttempt = now;
        
        // Lock if too many attempts
        if (formData.count >= this.maxFailedAttempts) {
            formData.lockedUntil = now + this.lockoutTime;
            this.logSecurityEvent('FORM_LOCKOUT', {
                formId: formId,
                attempts: formData.count,
                lockedUntil: new Date(formData.lockedUntil).toISOString()
            });
            
            throw new Error(`Too many attempts. Account locked for ${this.lockoutTime / 60000} minutes.`);
        }
    }
    
    checkRateLimit(key, maxAttempts, timeWindow) {
        const now = Date.now();
        
        if (!this.failedAttempts[key]) {
            this.failedAttempts[key] = {
                attempts: [],
                lockedUntil: 0
            };
        }
        
        const data = this.failedAttempts[key];
        
        // Check if locked
        if (now < data.lockedUntil) {
            return false;
        }
        
        // Filter attempts within time window
        data.attempts = data.attempts.filter(time => now - time < timeWindow);
        
        // Check if max attempts reached
        if (data.attempts.length >= maxAttempts) {
            data.lockedUntil = now + this.lockoutTime;
            this.logSecurityEvent('RATE_LIMIT_EXCEEDED', {
                key: key,
                attempts: data.attempts.length,
                lockedUntil: new Date(data.lockedUntil).toISOString()
            });
            return false;
        }
        
        // Add current attempt
        data.attempts.push(now);
        return true;
    }
    
    detectAbuse(type, data) {
        console.warn(`🚨 Abuse detected: ${type}`, data);
        
        this.logSecurityEvent(`ABUSE_${type}`, {
            ...data,
            userAgent: navigator.userAgent,
            platform: navigator.platform,
            url: window.location.href
        });
        
        // Take action based on abuse type
        switch (type) {
            case 'RAPID_CLICKING':
                this.showSecurityWarning('Please slow down your interactions');
                break;
                
            case 'MULTIPLE_TABS':
                this.showSecurityWarning('Please use only one tab at a time');
                break;
                
            default:
                this.showSecurityWarning('Suspicious activity detected');
        }
    }
    
    throttleUser() {
        // Add a delay to user interactions
        const elements = document.querySelectorAll('button, a, input');
        elements.forEach(el => {
            const originalClick = el.onclick;
            
            el.onclick = (e) => {
                e.preventDefault();
                setTimeout(() => {
                    if (originalClick) originalClick.call(el, e);
                }, 1000); // 1 second delay
            };
        });
        
        // Remove throttle after 30 seconds
        setTimeout(() => {
            elements.forEach(el => {
                el.onclick = null;
            });
        }, 30000);
    }
    
    // ==================== SECURITY LOGGING ====================
    
    logSecurityEvent(eventType, data) {
        // Log to console in development
        if (window.location.hostname === 'localhost' || window.location.hostname.includes('127.0.0.1')) {
            console.log(`🔐 Security Event: ${eventType}`, data);
        }
        
        // Send to backend if available
        this.sendSecurityLog(eventType, data);
        
        // Store locally
        this.storeSecurityEvent(eventType, data);
    }
    
    async sendSecurityLog(eventType, data) {
        try {
            const token = await auth?.getToken();
            if (!token) return;
            
            await fetch(`${BACKEND_URL}/api/security/log`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    eventType,
                    data,
                    timestamp: new Date().toISOString(),
                    userId: auth?.currentUser?.uid,
                    userEmail: auth?.currentUser?.email
                })
            });
        } catch (error) {
            // Silent fail - security logging shouldn't break the app
            console.error('Security log error:', error);
        }
    }
    
    storeSecurityEvent(eventType, data) {
        try {
            const events = JSON.parse(localStorage.getItem('security_events') || '[]');
            events.push({
                eventType,
                data,
                timestamp: new Date().toISOString()
            });
            
            // Keep only last 100 events
            if (events.length > 100) {
                events.splice(0, events.length - 100);
            }
            
            localStorage.setItem('security_events', JSON.stringify(events));
        } catch (error) {
            console.error('Store security event error:', error);
        }
    }
    
    // ==================== UTILITIES ====================
    
    showSecurityWarning(message) {
        // Create warning toast
        const toast = document.createElement('div');
        toast.className = 'security-warning-toast';
        toast.innerHTML = `
            <div class="alert alert-warning alert-dismissible fade show" role="alert">
                <i class="fas fa-shield-alt"></i> <strong>Security Notice:</strong> ${message}
                <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
            </div>
        `;
        
        // Add styles if not already added
        if (!document.querySelector('#security-toast-style')) {
            const style = document.createElement('style');
            style.id = 'security-toast-style';
            style.textContent = `
                .security-warning-toast {
                    position: fixed;
                    top: 20px;
                    right: 20px;
                    z-index: 99999;
                    min-width: 300px;
                    max-width: 400px;
                }
            `;
            document.head.appendChild(style);
        }
        
        document.body.appendChild(toast);
        
        // Auto remove after 5 seconds
        setTimeout(() => {
            if (toast.parentNode) {
                toast.parentNode.removeChild(toast);
            }
        }, 5000);
    }
    
    getSecurityReport() {
        const events = JSON.parse(localStorage.getItem('security_events') || '[]');
        const failedAttempts = this.failedAttempts;
        
        return {
            totalEvents: events.length,
            recentEvents: events.slice(-10),
            failedAttempts: failedAttempts,
            settings: {
                antiDownload: this.antiDownloadEnabled,
                routeProtection: this.routeProtectionEnabled,
                abuseDetection: this.abuseDetectionEnabled
            },
            userInfo: {
                isAuthenticated: !!auth?.currentUser,
                email: auth?.currentUser?.email,
                isAdmin: auth?.currentUser?.email === ADMIN_EMAIL
            }
        };
    }
    
    // ==================== PUBLIC API ====================
    
    enableProtection(protectionType) {
        switch (protectionType) {
            case 'anti-download':
                this.antiDownloadEnabled = true;
                break;
            case 'route-guards':
                this.routeProtectionEnabled = true;
                break;
            case 'abuse-detection':
                this.abuseDetectionEnabled = true;
                break;
        }
    }
    
    disableProtection(protectionType) {
        switch (protectionType) {
            case 'anti-download':
                this.antiDownloadEnabled = false;
                break;
            case 'route-guards':
                this.routeProtectionEnabled = false;
                break;
            case 'abuse-detection':
                this.abuseDetectionEnabled = false;
                break;
        }
    }
    
    resetFailedAttempts() {
        this.failedAttempts = {};
    }
    
    clearSecurityLogs() {
        localStorage.removeItem('security_events');
    }
}

// Initialize security system
let security = null;
document.addEventListener('DOMContentLoaded', function() {
    security = new SecuritySystem();
    window.security = security;
    
    // Make security report available globally
    window.getSecurityReport = () => security.getSecurityReport();
});
