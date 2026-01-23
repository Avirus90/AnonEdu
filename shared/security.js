// Security System for EduAnon Platform
class SecuritySystem {
    constructor() {
        this.initSecurity();
    }
    
    initSecurity() {
        // Basic security measures
        this.disableRightClick();
        this.disableDevTools();
        this.preventTextSelection();
        
        console.log('🔒 Security System Initialized');
    }
    
    disableRightClick() {
        document.addEventListener('contextmenu', (e) => {
            if (window.location.pathname.includes('/student/')) {
                e.preventDefault();
                this.showSecurityWarning('Right-click disabled to protect content');
                return false;
            }
        });
    }
    
    disableDevTools() {
        // Prevent F12, Ctrl+Shift+I, Ctrl+Shift+J, Ctrl+Shift+C
        document.addEventListener('keydown', (e) => {
            if (e.key === 'F12' || 
                (e.ctrlKey && e.shiftKey && (e.key === 'I' || e.key === 'J' || e.key === 'C'))) {
                e.preventDefault();
                return false;
            }
        });
    }
    
    preventTextSelection() {
        // Only apply to student pages
        if (window.location.pathname.includes('/student/')) {
            const style = document.createElement('style');
            style.textContent = `
                body {
                    user-select: none;
                    -webkit-user-select: none;
                    -moz-user-select: none;
                    -ms-user-select: none;
                }
                
                .allow-select {
                    user-select: text;
                    -webkit-user-select: text;
                    -moz-user-select: text;
                    -ms-user-select: text;
                }
            `;
            document.head.appendChild(style);
        }
    }
    
    showSecurityWarning(message) {
        // Create a temporary warning message
        const warning = document.createElement('div');
        warning.className = 'security-warning';
        warning.innerHTML = `
            <div class="alert alert-warning alert-dismissible fade show" role="alert">
                <i class="fas fa-shield-alt"></i> ${message}
                <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
            </div>
        `;
        
        // Add styles
        if (!document.querySelector('#security-warning-style')) {
            const style = document.createElement('style');
            style.id = 'security-warning-style';
            style.textContent = `
                .security-warning {
                    position: fixed;
                    top: 20px;
                    right: 20px;
                    z-index: 9999;
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
        
        document.body.appendChild(warning);
        
        // Auto remove after 3 seconds
        setTimeout(() => {
            if (warning.parentNode) {
                warning.remove();
            }
        }, 3000);
    }
    
    // Public API
    getSecurityReport() {
        return {
            securityEnabled: true,
            rightClickDisabled: true,
            devToolsDisabled: true,
            textSelectionDisabled: window.location.pathname.includes('/student/')
        };
    }
}

// Initialize security system
let security = null;
document.addEventListener('DOMContentLoaded', function() {
    security = new SecuritySystem();
    window.security = security;
});
