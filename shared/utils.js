// Utility Functions for EduAnon Platform

class EduUtils {
    static showLoading(message = 'Loading...') {
        this.hideLoading();
        
        const loader = document.createElement('div');
        loader.id = 'eduLoading';
        loader.className = 'edu-loading-overlay';
        loader.innerHTML = `
            <div class="edu-loading-content">
                <div class="spinner-border text-primary" role="status">
                    <span class="visually-hidden">Loading...</span>
                </div>
                <div class="mt-3">${message}</div>
            </div>
        `;
        
        const style = document.createElement('style');
        style.textContent = `
            .edu-loading-overlay {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0, 0, 0, 0.7);
                display: flex;
                justify-content: center;
                align-items: center;
                z-index: 9999;
                color: white;
            }
            .edu-loading-content {
                text-align: center;
                padding: 30px;
                background: rgba(255, 255, 255, 0.1);
                border-radius: 10px;
                backdrop-filter: blur(10px);
            }
        `;
        
        document.head.appendChild(style);
        document.body.appendChild(loader);
    }
    
    static hideLoading() {
        const loader = document.getElementById('eduLoading');
        if (loader) loader.remove();
    }
    
    static showToast(message, type = 'info') {
        const toastId = 'eduToast' + Date.now();
        const toast = document.createElement('div');
        toast.id = toastId;
        toast.className = `toast align-items-center text-bg-${type} border-0`;
        toast.setAttribute('role', 'alert');
        toast.innerHTML = `
            <div class="d-flex">
                <div class="toast-body">
                    ${message}
                </div>
                <button type="button" class="btn-close btn-close-white me-2 m-auto" 
                        data-bs-dismiss="toast"></button>
            </div>
        `;
        
        document.body.appendChild(toast);
        
        const bsToast = new bootstrap.Toast(toast, { delay: 3000 });
        bsToast.show();
        
        toast.addEventListener('hidden.bs.toast', () => {
            toast.remove();
        });
    }
    
    static async fetchWithAuth(url, options = {}) {
        const token = await window.eduAuth?.getAuthToken();
        
        const defaultOptions = {
            headers: {
                'Content-Type': 'application/json',
                ...(token ? { 'Authorization': `Bearer ${token}` } : {})
            }
        };
        
        try {
            const response = await fetch(url, { ...defaultOptions, ...options });
            
            if (response.status === 401) {
                window.location.href = 'index.html';
                return null;
            }
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            return await response.json();
        } catch (error) {
            console.error('Fetch error:', error);
            this.showToast(`Error: ${error.message}`, 'danger');
            throw error;
        }
    }
    
    static formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }
    
    static formatDate(dateString) {
        const date = new Date(dateString);
        return date.toLocaleDateString('hi-IN', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    }
    
    static sanitizeInput(input) {
        if (typeof input !== 'string') return input;
        return input
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#x27;')
            .replace(/\//g, '&#x2F;');
    }
    
    static debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }
    
    static getFileIcon(fileType) {
        const icons = {
            'pdf': 'fa-file-pdf',
            'ppt': 'fa-file-powerpoint',
            'pptx': 'fa-file-powerpoint',
            'doc': 'fa-file-word',
            'docx': 'fa-file-word',
            'xls': 'fa-file-excel',
            'xlsx': 'fa-file-excel',
            'txt': 'fa-file-alt',
            'zip': 'fa-file-archive',
            'rar': 'fa-file-archive',
            'image': 'fa-file-image',
            'video': 'fa-file-video',
            'audio': 'fa-file-audio',
            'default': 'fa-file'
        };
        
        if (!fileType) return icons.default;
        
        const type = fileType.toLowerCase();
        if (type.includes('pdf')) return icons.pdf;
        if (type.includes('ppt')) return icons.ppt;
        if (type.includes('word')) return icons.doc;
        if (type.includes('excel')) return icons.xls;
        if (type.includes('text')) return icons.txt;
        if (type.includes('zip') || type.includes('rar')) return icons.zip;
        if (type.includes('image')) return icons.image;
        if (type.includes('video')) return icons.video;
        if (type.includes('audio')) return icons.audio;
        
        return icons.default;
    }
}

// Make available globally
window.EduUtils = EduUtils;
