// Student Panel JavaScript
class StudentPanel {
    constructor() {
        this.courses = [];
        this.progress = {};
        this.initFirestore();
        this.checkAccess();
    }
    
    initFirestore() {
        if (!firebase.apps.length) {
            firebase.initializeApp(FIREBASE_CONFIG);
        }
        this.db = firebase.firestore();
        this.userId = eduAuth?.currentUser?.uid;
    }
    
    checkAccess() {
        if (!eduAuth || !eduAuth.currentUser) {
            // Check if demo mode
            if (sessionStorage.getItem('edu_demo_mode') !== 'true') {
                window.location.href = '../index.html';
            }
        } else {
            // Show user email
            document.getElementById('studentEmail').textContent = eduAuth.currentUser.email;
            
            // Check if trying to access as admin
            if (eduAuth.currentUser.email === ADMIN_EMAIL) {
                console.log('Admin accessing student view');
            }
        }
    }
    
    async loadDashboard() {
        try {
            // Load courses
            await this.loadCourses();
            
            // Load progress if logged in
            if (this.userId) {
                await this.loadProgress();
            }
            
        } catch (error) {
            console.error('Dashboard load error:', error);
            this.showToast('Failed to load content', 'danger');
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
                
                // Calculate progress for this course
                const progress = this.progress[course.id] || { completed: 0, total: 0 };
                const percent = progress.total > 0 ? Math.round((progress.completed / progress.total) * 100) : 0;
                
                html += `
                    <div class="col-md-4 mb-4">
                        <div class="course-card">
                            <div class="course-card-header">
                                ${course.title}
                            </div>
                            <div class="course-card-body">
                                <p class="text-muted">${course.description || 'No description available'}</p>
                                
                                <div class="mb-3">
                                    <small class="text-muted">Progress:</small>
                                    <div class="progress-bar">
                                        <div class="progress-fill" style="width: ${percent}%"></div>
                                    </div>
                                    <small class="text-muted d-block text-end">${percent}%</small>
                                </div>
                                
                                <div class="d-grid gap-2">
                                    <button class="btn btn-primary" 
                                            onclick="studentPanel.viewCourseContent('${course.id}')">
                                        <i class="fas fa-play"></i> Start Learning
                                    </button>
                                    <button class="btn btn-outline-secondary" 
                                            onclick="studentPanel.viewCourseInfo('${course.id}')">
                                        <i class="fas fa-info-circle"></i> Details
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
                </div>
            `;
        }
    }
    
    async loadProgress() {
        try {
            if (!this.userId) return;
            
            // Load user progress
            const progressSnap = await this.db.collection('userProgress')
                .where('userId', '==', this.userId)
                .get();
            
            let totalCompleted = 0;
            let totalViewed = 0;
            let totalTests = 0;
            let totalScore = 0;
            
            progressSnap.forEach(doc => {
                const data = doc.data();
                const courseId = data.courseId;
                
                // Store progress for each course
                this.progress[courseId] = {
                    completed: data.completedContent?.length || 0,
                    total: 0
                };
                
                totalViewed += data.completedContent?.length || 0;
                
                // Calculate test scores
                if (data.testScores) {
                    const scores = Object.values(data.testScores);
                    totalTests += scores.length;
                    totalScore += scores.reduce((a, b) => a + b, 0);
                }
            });
            
            // Update UI
            document.getElementById('completedCourses').textContent = 
                Object.keys(this.progress).length;
            document.getElementById('viewedContent').textContent = totalViewed;
            
            if (totalTests > 0) {
                const avgScore = Math.round(totalScore / totalTests);
                document.getElementById('testScore').textContent = avgScore + '%';
            }
            
        } catch (error) {
            console.error('Load progress error:', error);
        }
    }
    
    async viewCourseContent(courseId) {
        try {
            // Load course content
            const contentSnap = await this.db.collection('courseContent')
                .where('courseId', '==', courseId)
                .where('isLocked', '!=', true)
                .orderBy('order')
                .get();
            
            if (contentSnap.empty) {
                this.showToast('No content available for this course', 'warning');
                return;
            }
            
            // Show first content item
            const firstDoc = contentSnap.docs[0];
            const firstContent = { id: firstDoc.id, ...firstDoc.data() };
            this.showContentViewer(firstContent);
            
        } catch (error) {
            console.error('View course error:', error);
            this.showToast('Failed to load course content', 'danger');
        }
    }
    
    async showContentViewer(content) {
        try {
            // Get file from backend
            const token = await eduAuth?.getToken();
            const headers = token ? { 'Authorization': `Bearer ${token}` } : {};
            
            // For demo, use sample content
            if (sessionStorage.getItem('edu_demo_mode') === 'true') {
                this.showDemoContent(content);
                return;
            }
            
            const response = await fetch(
                `${BACKEND_URLS.active}/api/telegram/file/${content.telegramFileId}?viewer=google`,
                { headers }
            );
            
            if (!response.ok) throw new Error('File not found');
            
            const data = await response.json();
            
            // Show in modal
            const modal = new bootstrap.Modal(document.getElementById('contentViewerModal'));
            document.getElementById('viewerTitle').textContent = content.title;
            
            let viewerHtml = '';
            const fileType = content.type ? content.type.toLowerCase() : 'pdf';
            
            if (fileType === 'pdf' || fileType === 'ppt' || fileType === 'pptx') {
                // Google Docs Viewer
                viewerHtml = `
                    <iframe src="${data.url || 'https://docs.google.com/viewer?url=https://example.com/sample.pdf&embedded=true'}" 
                            style="width:100%; height:600px; border:none;"
                            frameborder="0"
                            allow="autoplay"
                            oncontextmenu="return false"
                            onselectstart="return false"
                            ondragstart="return false">
                    </iframe>
                `;
            } else if (fileType === 'image') {
                // Image viewer
                viewerHtml = `
                    <div class="text-center">
                        <img src="${data.url || 'https://via.placeholder.com/600x400?text=Sample+Image'}" 
                             class="img-fluid"
                             style="max-height: 600px;"
                             oncontextmenu="return false"
                             draggable="false">
                    </div>
                `;
            } else if (fileType === 'video') {
                // Video viewer with download disabled
                viewerHtml = `
                    <div class="text-center">
                        <video controls controlsList="nodownload" 
                               style="max-width: 100%; max-height: 600px;"
                               oncontextmenu="return false">
                            <source src="${data.url || 'https://sample-videos.com/video123/mp4/720/big_buck_bunny_720p_1mb.mp4'}" type="video/mp4">
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
                    </div>
                `;
            }
            
            document.getElementById('viewerContent').innerHTML = viewerHtml;
            modal.show();
            
            // Track view if user is logged in
            if (this.userId && content.id) {
                this.trackContentViewed(content.id, content.courseId);
            }
            
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
    
    showDemoContent(content) {
        const modal = new bootstrap.Modal(document.getElementById('contentViewerModal'));
        document.getElementById('viewerTitle').textContent = content.title + ' (Demo)';
        
        const viewerHtml = `
            <div class="text-center py-5">
                <i class="fas fa-eye fa-3x text-warning mb-3"></i>
                <h5>Demo Preview</h5>
                <p class="text-muted">In the full version, you would see the actual content here.</p>
                <div class="mt-4">
                    <p><strong>Content Type:</strong> ${content.type || 'PDF'}</p>
                    <p><strong>Description:</strong> This is sample content for demonstration.</p>
                </div>
                <div class="alert alert-info mt-4">
                    <i class="fas fa-info-circle"></i> 
                    Login to access real content from Telegram storage.
                </div>
            </div>
        `;
        
        document.getElementById('viewerContent').innerHTML = viewerHtml;
        modal.show();
    }
    
    async trackContentViewed(contentId, courseId) {
        try {
            if (!this.userId) return;
            
            const progressId = `${this.userId}_${courseId}`;
            await this.db.collection('userProgress').doc(progressId).set({
                userId: this.userId,
                courseId: courseId,
                completedContent: firebase.firestore.FieldValue.arrayUnion(contentId),
                lastAccessed: firebase.firestore.FieldValue.serverTimestamp()
            }, { merge: true });
            
        } catch (error) {
            console.error('Track view error:', error);
        }
    }
    
    viewCourseInfo(courseId) {
        const course = this.courses.find(c => c.id === courseId);
        if (course) {
            alert(`Course Details:\n\nTitle: ${course.title}\n\nDescription: ${course.description || 'No description'}`);
        }
    }
    
    showToast(message, type = 'info') {
        alert(message); // Simple alert for now
    }
}

// Initialize
let studentPanel = null;
document.addEventListener('DOMContentLoaded', function() {
    studentPanel = new StudentPanel();
    window.studentPanel = studentPanel;
    
    // Load dashboard after a short delay
    setTimeout(() => {
        studentPanel.loadDashboard();
    }, 1000);
});
