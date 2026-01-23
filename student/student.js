// Student Panel JavaScript
class StudentPanel {
    constructor() {
        this.courses = [];
        this.initFirestore();
        this.checkAccess();
    }
    
    initFirestore() {
        if (!firebase.apps.length) {
            firebase.initializeApp(FIREBASE_CONFIG);
        }
        this.db = firebase.firestore();
    }
    
    checkAccess() {
        // Check if user is admin trying to access student panel
        if (window.auth && window.auth.currentUser && window.auth.currentUser.email === ADMIN_EMAIL) {
            // Allow admin to view student panel
            console.log('Admin viewing student panel');
        }
    }
    
    async loadCourses() {
        try {
            const coursesSnap = await this.db.collection('courses')
                .where('isPublished', '==', true)
                .get();
            
            this.courses = [];
            const coursesList = document.getElementById('coursesList');
            
            if (coursesSnap.empty) {
                coursesList.innerHTML = `
                    <div class="col-12 text-center py-5">
                        <i class="fas fa-book fa-3x text-muted mb-3"></i>
                        <h5>No courses available</h5>
                        <p class="text-muted">Courses will appear here once published by admin</p>
                    </div>
                `;
                return;
            }
            
            let html = '';
            coursesSnap.forEach(doc => {
                const course = { id: doc.id, ...doc.data() };
                this.courses.push(course);
                
                html += `
                    <div class="col-md-4 mb-4">
                        <div class="course-card">
                            <div class="course-card-header">
                                ${course.title}
                            </div>
                            <div class="course-card-body">
                                <p class="text-muted">${course.description || 'No description available'}</p>
                                
                                <div class="d-grid gap-2">
                                    <button class="btn btn-primary" 
                                            onclick="viewCourse('${course.id}')">
                                        <i class="fas fa-play"></i> View Course
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                `;
            });
            
            coursesList.innerHTML = html;
            
        } catch (error) {
            console.error('Load courses error:', error);
            coursesList.innerHTML = `
                <div class="col-12 text-center py-5">
                    <i class="fas fa-exclamation-triangle fa-3x text-danger mb-3"></i>
                    <h5>Failed to load courses</h5>
                    <p class="text-muted">${error.message}</p>
                </div>
            `;
        }
    }
    
    async viewCourse(courseId) {
        try {
            // Load course content
            const contentSnap = await this.db.collection('courseContent')
                .where('courseId', '==', courseId)
                .orderBy('order')
                .get();
            
            if (contentSnap.empty) {
                EduUtils.showToast('No content available for this course', 'warning');
                return;
            }
            
            // Show content in modal
            const content = contentSnap.docs[0].data();
            this.showContentViewer(content);
            
        } catch (error) {
            console.error('View course error:', error);
            EduUtils.showToast('Failed to load course content', 'danger');
        }
    }
    
    async showContentViewer(content) {
        try {
            const modal = new bootstrap.Modal(document.getElementById('contentViewerModal'));
            document.getElementById('viewerTitle').textContent = content.title;
            
            let viewerHtml = '';
            const fileType = content.type?.toLowerCase();
            
            if (content.downloadUrl) {
                if (fileType === 'pdf') {
                    // PDF viewer using Google Docs
                    viewerHtml = `
                        <iframe src="https://docs.google.com/viewer?url=${encodeURIComponent(content.downloadUrl)}&embedded=true" 
                                style="width:100%; height:600px; border:none;"
                                frameborder="0">
                        </iframe>
                    `;
                } else if (fileType === 'image') {
                    // Image viewer
                    viewerHtml = `
                        <div class="text-center">
                            <img src="${content.downloadUrl}" 
                                 class="img-fluid"
                                 style="max-height: 600px;">
                        </div>
                    `;
                } else if (fileType === 'video') {
                    // Video viewer
                    viewerHtml = `
                        <div class="text-center">
                            <video controls style="max-width: 100%; max-height: 600px;">
                                <source src="${content.downloadUrl}" type="video/mp4">
                                Your browser does not support the video tag.
                            </video>
                        </div>
                    `;
                } else {
                    viewerHtml = `
                        <div class="text-center py-5">
                            <i class="fas fa-file fa-3x text-muted mb-3"></i>
                            <h5>File Preview Not Available</h5>
                            <p class="text-muted">This file type cannot be previewed in browser</p>
                            <a href="${content.downloadUrl}" target="_blank" class="btn btn-primary">
                                <i class="fas fa-download"></i> View File
                            </a>
                        </div>
                    `;
                }
            } else {
                viewerHtml = `
                    <div class="text-center py-5">
                        <i class="fas fa-exclamation-triangle fa-3x text-danger mb-3"></i>
                        <h5>File Not Available</h5>
                        <p class="text-muted">The content file is not accessible</p>
                    </div>
                `;
            }
            
            document.getElementById('viewerContent').innerHTML = viewerHtml;
            modal.show();
            
        } catch (error) {
            console.error('Show content error:', error);
            document.getElementById('viewerContent').innerHTML = `
                <div class="text-center py-5">
                    <i class="fas fa-exclamation-triangle fa-3x text-danger mb-3"></i>
                    <h5>Failed to load content</h5>
                    <p class="text-muted">${error.message}</p>
                </div>
            `;
        }
    }
}

// Global functions
function viewCourse(courseId) {
    if (window.studentPanel) {
        window.studentPanel.viewCourse(courseId);
    }
}

// Initialize
let studentPanel = null;
document.addEventListener('DOMContentLoaded', function() {
    studentPanel = new StudentPanel();
    window.studentPanel = studentPanel;
    
    // Load courses after a short delay
    setTimeout(() => {
        studentPanel.loadCourses();
    }, 1000);
});
