// Utility Functions for EduAnon Platform
class EduUtils {
    static showToast(message, type = 'info') {
        // Remove existing toasts
        const existingToasts = document.querySelectorAll('.edu-toast');
        existingToasts.forEach(toast => toast.remove());
        
        const toast = document.createElement('div');
        toast.className = `edu-toast alert alert-${type} alert-dismissible fade show`;
        toast.innerHTML = `
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        `;
        
        // Add styles if not already added
        if (!document.querySelector('#toast-style')) {
            const style = document.createElement('style');
            style.id = 'toast-style';
            style.textContent = `
                .edu-toast {
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
        
        document.body.appendChild(toast);
        
        // Auto remove after 5 seconds
        setTimeout(() => {
            if (toast.parentNode) {
                toast.remove();
            }
        }, 5000);
    }
    
    static formatFileSize(bytes) {
        if (!bytes) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }
    
    static formatDate(date) {
        if (!date) return 'N/A';
        const d = date.toDate ? date.toDate() : new Date(date);
        return d.toLocaleDateString('hi-IN', {
            day: 'numeric',
            month: 'short',
            year: 'numeric'
        });
    }
    
    static getFileIcon(fileType) {
        const icons = {
            'pdf': 'fa-file-pdf text-danger',
            'doc': 'fa-file-word text-primary',
            'docx': 'fa-file-word text-primary',
            'ppt': 'fa-file-powerpoint text-warning',
            'pptx': 'fa-file-powerpoint text-warning',
            'xls': 'fa-file-excel text-success',
            'xlsx': 'fa-file-excel text-success',
            'txt': 'fa-file-alt text-secondary',
            'zip': 'fa-file-archive text-muted',
            'rar': 'fa-file-archive text-muted',
            'image': 'fa-file-image text-info',
            'jpg': 'fa-file-image text-info',
            'jpeg': 'fa-file-image text-info',
            'png': 'fa-file-image text-info',
            'video': 'fa-file-video text-primary',
            'mp4': 'fa-file-video text-primary',
            'avi': 'fa-file-video text-primary',
            'audio': 'fa-file-audio text-success',
            'default': 'fa-file text-muted'
        };
        
        if (!fileType) return icons.default;
        
        const type = fileType.toLowerCase();
        if (type.includes('pdf')) return icons.pdf;
        if (type.includes('word') || type.includes('doc')) return icons.doc;
        if (type.includes('powerpoint') || type.includes('ppt')) return icons.ppt;
        if (type.includes('excel') || type.includes('xls')) return icons.xls;
        if (type.includes('text') || type.includes('txt')) return icons.txt;
        if (type.includes('zip') || type.includes('rar')) return icons.zip;
        if (type.includes('image') || type.includes('jpg') || type.includes('jpeg') || type.includes('png')) return icons.image;
        if (type.includes('video') || type.includes('mp4') || type.includes('avi')) return icons.video;
        if (type.includes('audio')) return icons.audio;
        
        return icons.default;
    }
    
    static showLoading(show = true) {
        if (show) {
            const loadingDiv = document.createElement('div');
            loadingDiv.id = 'global-loading';
            loadingDiv.innerHTML = `
                <div style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); z-index: 9999; display: flex; align-items: center; justify-content: center;">
                    <div class="spinner-border text-light" style="width: 3rem; height: 3rem;"></div>
                </div>
            `;
            document.body.appendChild(loadingDiv);
        } else {
            const loadingDiv = document.getElementById('global-loading');
            if (loadingDiv) loadingDiv.remove();
        }
    }
}

window.EduUtils = EduUtils;
