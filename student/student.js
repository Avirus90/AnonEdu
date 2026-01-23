// Student Panel JavaScript - FIXED VERSION
class StudentPanel {
    constructor() {
        this.courses = [];
        this.courseContent = [];
        this.initFirestore();
        this.checkAccess();
    }
    
    initFirestore() {
        try {
            if (!firebase.apps.length) {
                firebase.initializeApp(FIREBASE_CONFIG);
            }
            this.db = firebase.firestore();
            console.log('✅ Student Firestore initialized');
        } catch (error) {
            console.error('Firestore init error:', error);
        }
    }
    
    checkAccess() {
        const isDemo = sessionStorage.getItem('edu_demo_mode') === 'true';
        
        if (!isDemo && (!window.auth || !window.auth.currentUser)) {
            window.location.href = '../index.html';
            return;
        }
    }
    
    async loadCourses() {
        try {
            EduUtils.showLoading(true);
            
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
                                    <button class="btn btn-outline-secondary" 
                                            onclick="viewCourseContent('${course.id}')">
                                        <i class="fas fa-list"></i> View Content
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
            
            const coursesList = document.getElementById('coursesList');
            coursesList.innerHTML = `
                <div class="col-12 text-center py-5">
                    <i class="fas fa-exclamation-triangle fa-3x text-danger mb-3"></i>
                    <h5>Failed to load courses</h5>
                    <p class="text-muted">${error.message}</p>
                    <button class="btn btn-primary" onclick="window.location.reload()">
                        <i class="fas fa-redo"></i> Try Again
                    </button>
                </div>
            `;
        } finally {
            EduUtils.showLoading(false);
        }
    }
    
    async viewCourse(courseId) {
        try {
            EduUtils.showLoading(true);
            
            // Load course content
            const contentSnap = await this.db.collection('courseContent')
                .where('courseId', '==', courseId)
                .orderBy('order')
                .limit(1)
                .get();
            
            if (contentSnap.empty) {
                EduUtils.showToast('No content available for this course', 'warning');
                return;
            }
            
            const content = contentSnap.docs[0].data();
            this.showContentViewer(content);
            
        } catch (error) {
            console.error('View course error:', error);
            EduUtils.showToast('Failed to load course content', 'danger');
        } finally {
            EduUtils.showLoading(false);
        }
    }
    
    async viewCourseContent(courseId) {
        try {
            EduUtils.showLoading(true);
            
            const contentSnap = await this.db.collection('courseContent')
                .where('courseId', '==', courseId)
                .orderBy('order')
                .get();
            
            if (contentSnap.empty) {
                EduUtils.showToast('No content available for this course', 'warning');
                return;
            }
            
            const modal = new bootstrap.Modal(document.getElementById('contentViewerModal'));
            
            let html = '<div class="content-grid">';
            contentSnap.forEach(doc => {
                const content = doc.data();
                
                html += `
                    <div class="content-item">
                        <h6>${content.title}</h6>
                        <p class="small text-muted mb-2">${content.type || 'file'}</p>
                        <div class="d-flex justify-content-between">
                            <button class="btn btn-sm btn-primary" 
                                    onclick="previewContent('${doc.id}')">
                                <i class="fas fa-eye"></i> View
                            </button>
                            <a href="${content.downloadUrl || '#'}" 
                               target="_blank" 
                               class="btn btn-sm btn-success"
                               ${!content.downloadUrl ? 'disabled' : ''}>
                                <i class="fas fa-download"></i> Download
                            </a>
                        </div>
                    </div>
                `;
            });
            
            html += '</div>';
            
            document.getElementById('viewerTitle').textContent = 'Course Content';
            document.getElementById('viewerContent').innerHTML = html;
            modal.show();
            
        } catch (error) {
            console.error('View content error:', error);
            EduUtils.showToast('Failed to load content', 'danger');
        } finally {
            EduUtils.showLoading(false);
        }
    }
    
    async previewContent(contentId) {
        try {
            const doc = await this.db.collection('courseContent').doc(contentId).get();
            if (!doc.exists) {
                EduUtils.showToast('Content not found', 'warning');
                return;
            }
            
            const content = doc.data();
            this.showContentViewer(content);
            
        } catch (error) {
            console.error('Preview error:', error);
            EduUtils.showToast('Failed to preview content', 'danger');
        }
    }
    
    async showContentViewer(content) {
        try {
            const modal = new bootstrap.Modal(document.getElementById('contentViewerModal'));
            document.getElementById('viewerTitle').textContent = content.title;
            
            let viewerHtml = '';
            const fileType = content.type?.toLowerCase() || 'document';
            
            if (content.downloadUrl && content.downloadUrl.startsWith('http')) {
                if (fileType === 'pdf') {
                    viewerHtml = `
                        <div class="ratio ratio-16x9">
                            <embed src="${content.downloadUrl}#toolbar=0&navpanes=0&scrollbar=0" 
                                   type="application/pdf" 
                                   style="width:100%; height:600px;">
                        </div>
                        <div class="mt-3 text-center">
                            <a href="${content.downloadUrl}" 
                               target="_blank" 
                               class="btn btn-success">
                                <i class="fas fa-download"></i> Download PDF
                            </a>
                        </div>
                    `;
                } else if (fileType === 'image') {
                    viewerHtml = `
                        <div class="text-center">
                            <img src="${content.downloadUrl}" 
                                 class="img-fluid"
                                 style="max-height: 500px; border-radius: 10px;">
                        </div>
                        <div class="mt-3 text-center">
                            <a href="${content.downloadUrl}" 
                               target="_blank" 
                               class="btn btn-success">
                                <i class="fas fa-download"></i> Download Image
                            </a>
                        </div>
                    `;
                } else if (fileType === 'video') {
                    viewerHtml = `
                        <div class="ratio ratio-16x9">
                            <video controls style="width:100%; border-radius: 10px;">
                                <source src="${content.downloadUrl}" type="video/mp4">
                                Your browser does not support the video tag.
                            </video>
                        </div>
                        <div class="mt-3 text-center">
                            <a href="${content.downloadUrl}" 
                               target="_blank" 
                               class="btn btn-success">
                                <i class="fas fa-download"></i> Download Video
                            </a>
                        </div>
                    `;
                } else {
                    viewerHtml = `
                        <div class="text-center py-5">
                            <i class="fas ${EduUtils.getFileIcon(fileType)} fa-3x mb-3"></i>
                            <h5>${content.title}</h5>
                            <p class="text-muted">${fileType.toUpperCase()} File</p>
                            <a href="${content.downloadUrl}" 
                               target="_blank" 
                               class="btn btn-primary">
                                <i class="fas fa-external-link-alt"></i> Open File
                            </a>
                        </div>
                    `;
                }
            } else {
                viewerHtml = `
                    <div class="text-center py-5">
                        <i class="fas fa-exclamation-triangle fa-3x text-warning mb-3"></i>
                        <h5>File Not Accessible</h5>
                        <p class="text-muted">The content file is currently not available</p>
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

function viewCourseContent(courseId) {
    if (window.studentPanel) {
        window.studentPanel.viewCourseContent(courseId);
    }
}

function previewContent(contentId) {
    if (window.studentPanel) {
        window.studentPanel.previewContent(contentId);
    }
}

// Initialize
let studentPanel = null;
document.addEventListener('DOMContentLoaded', function() {
    // Wait for everything to load
    setTimeout(() => {
        studentPanel = new StudentPanel();
        window.studentPanel = studentPanel;
        
        // Load courses after a short delay
        setTimeout(() => {
            studentPanel.loadCourses();
        }, 1000);
    }, 1500);
});
