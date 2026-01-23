// Security System for EduAnon Platform
class SecuritySystem {
    constructor() {
        this.securityEnabled = true;
        this.initSecurity();
    }
    
    initSecurity() {
        if (window.location.pathname.includes('/student/') || 
            window.location.pathname.includes('/admin/')) {
            this.enableBasicSecurity();
        }
        
        console.log('🔒 Security System Initialized');
    }
    
    enableBasicSecurity() {
        // Disable right click on student pages
        if (window.location.pathname.includes('/student/')) {
            this.disableRightClick();
        }
        
        // Prevent text selection on student pages
        if (window.location.pathname.includes('/student/')) {
            this.preventTextSelection();
        }
        
        // Log security events
        this.logSecurityEvent('security_initialized', {
            page: window.location.pathname,
            time: new Date().toISOString()
        });
    }
    
    disableRightClick() {
        document.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            this.showSecurityAlert('Right-click is disabled to protect content');
            return false;
        }, false);
    }
    
    preventTextSelection() {
        // Only prevent on content areas
        setTimeout(() => {
            const style = document.createElement('style');
            style.textContent = `
                .protected-content {
                    user-select: none;
                    -webkit-user-select: none;
                    -moz-user-select: none;
                    -ms-user-select: none;
                }
                
                .allow-selection {
                    user-select: text;
                    -webkit-user-select: text;
                    -moz-user-select: text;
                    -ms-user-select: text;
                }
            `;
            document.head.appendChild(style);
        }, 1000);
    }
    
    showSecurityAlert(message) {
        // Create security alert
        const alertDiv = document.createElement('div');
        alertDiv.className = 'security-alert';
        alertDiv.innerHTML = `
            <div class="alert alert-warning alert-dismissible fade show" role="alert">
                <i class="fas fa-shield-alt"></i> <strong>Security Notice:</strong> ${message}
                <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
            </div>
        `;
        
        // Add styles
        if (!document.querySelector('#security-alert-style')) {
            const style = document.createElement('style');
            style.id = 'security-alert-style';
            style.textContent = `
                .security-alert {
                    position: fixed;
                    top: 20px;
                    right: 20px;
                    z-index: 99999;
                    min-width: 300px;
                    max-width: 400px;
                    animation: slideIn 0.3s ease-out;
                }
                @keyframes slideIn {
                    from { transform: translateX(100%); opacity: 0; }
                    to { transform: translateX(0); opacity: 1; }
                }
            `;
            document.head.appendChild(style);
        }
        
        document.body.appendChild(alertDiv);
        
        // Auto remove after 3 seconds
        setTimeout(() => {
            if (alertDiv.parentNode) {
                alertDiv.remove();
            }
        }, 3000);
    }
    
    logSecurityEvent(eventType, data = {}) {
        const event = {
            type: eventType,
            timestamp: new Date().toISOString(),
            userAgent: navigator.userAgent,
            url: window.location.href,
            ...data
        };
        
        console.log('🔒 Security Event:', event);
        
        // In production, send to backend
        // this.sendToBackend(event);
    }
    
    sendToBackend(event) {
        // This would send security events to backend in production
        fetch(`${BACKEND_URL}/api/security/log`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(event)
        }).catch(error => {
            console.error('Security log error:', error);
        });
    }
    
    // Public API
    getSecurityStatus() {
        return {
            enabled: this.securityEnabled,
            rightClickDisabled: window.location.pathname.includes('/student/'),
            textSelectionDisabled: window.location.pathname.includes('/student/'),
            timestamp: new Date().toISOString()
        };
    }
    
    toggleSecurity(enabled) {
        this.securityEnabled = enabled;
        console.log(`Security ${enabled ? 'enabled' : 'disabled'}`);
        return this.securityEnabled;
    }
}

// Initialize security system
let security = null;
document.addEventListener('DOMContentLoaded', function() {
    // Only initialize on student and admin pages
    if (window.location.pathname.includes('/student/') || 
        window.location.pathname.includes('/admin/')) {
        security = new SecuritySystem();
        window.security = security;
    }
});
