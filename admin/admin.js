// Admin Panel JavaScript
class AdminPanel {
    constructor() {
        this.courses = [];
        this.initFirestore();
    }
    
    initFirestore() {
        if (!firebase.apps.length) {
            firebase.initializeApp(FIREBASE_CONFIG);
        }
        this.db = firebase.firestore();
    }
    
    async loadDashboard() {
        try {
            // Load courses count
            const coursesSnap = await this.db.collection('courses').get();
            document.getElementById('totalCourses').textContent = coursesSnap.size;
            
            // Load content count
            const contentSnap = await this.db.collection('courseContent').get();
            document.getElementById('totalContent').textContent = contentSnap.size;
            
            // Load users count
            const usersSnap = await this.db.collection('users').where('role', '==', 'student').get();
            document.getElementById('totalStudents').textContent = usersSnap.size;
            
            // Load Telegram files count
            this.loadTelegramFilesCount();
            
            // Load courses list
            this.loadCourses();
            
        } catch (error) {
            console.error('Dashboard load error:', error);
            EduUtils.showToast('Failed to load dashboard', 'danger');
        }
    }
    
    async loadTelegramFilesCount() {
        try {
            const response = await fetch(`${BACKEND_URL}/api/files`);
            if (response.ok) {
                const data = await response.json();
                document.getElementById('telegramFiles').textContent = 
                    data.total_files || data.files?.length || 0;
            }
        } catch (error) {
            console.log('Telegram files count error:', error);
        }
    }
    
    async loadCourses() {
        try {
            const coursesSnap = await this.db.collection('courses').get();
            this.courses = [];
            const coursesList = document.getElementById('coursesList');
            
            if (coursesSnap.empty) {
                coursesList.innerHTML = `
                    <div class="col-12 text-center py-5">
                        <i class="fas fa-book fa-3x text-muted mb-3"></i>
                        <h5>No courses found</h5>
                        <p class="text-muted">Create your first course to get started</p>
                        <button class="btn btn-primary" onclick="showCreateCourse()">
                            <i class="fas fa-plus"></i> Create Course
                        </button>
                    </div>
                `;
                return;
            }
            
            let html = '';
            coursesSnap.forEach(doc => {
                const course = { id: doc.id, ...doc.data() };
                this.courses.push(course);
                
                html += `
                    <div class="col-md-6 mb-3">
                        <div class="card h-100">
                            <div class="card-body">
                                <h5 class="card-title">${course.title}</h5>
                                <p class="card-text text-muted">${course.description || 'No description'}</p>
                                <div class="d-flex justify-content-between align-items-center">
                                    <small class="text-muted">
                                        ${course.createdAt ? 'Created: ' + new Date(course.createdAt?.toDate()).toLocaleDateString() : ''}
                                    </small>
                                    <div class="btn-group btn-group-sm">
                                        <button class="btn btn-outline-warning" 
                                                onclick="editCourse('${course.id}')">
                                            <i class="fas fa-edit"></i> Edit
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                `;
            });
            
            coursesList.innerHTML = html;
            
        } catch (error) {
            console.error('Load courses error:', error);
            EduUtils.showToast('Failed to load courses', 'danger');
        }
    }
    
    async syncTelegramFiles() {
        try {
            if (!confirm('Sync files from Telegram channel?')) return;
            
            const token = await auth.getToken();
            if (!token) {
                EduUtils.showToast('Please login first', 'warning');
                return;
            }
            
            // First, check if we have a course
            const coursesSnap = await this.db.collection('courses').get();
            if (coursesSnap.empty) {
                alert('Please create a course first');
                showCreateCourse();
                return;
            }
            
            // Use first course for sync
            const courseId = coursesSnap.docs[0].id;
            
            EduUtils.showToast('Syncing files from Telegram...', 'info');
            
            const response = await fetch(`${BACKEND_URL}/api/admin/sync-telegram`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ 
                    courseId,
                    channelId: TELEGRAM_CONFIG.publicChannelId 
                })
            });
            
            if (response.ok) {
                const data = await response.json();
                EduUtils.showToast(`Synced ${data.synced} files from Telegram`, 'success');
                this.loadDashboard();
            } else {
                throw new Error('Sync failed');
            }
            
        } catch (error) {
            console.error('Sync error:', error);
            EduUtils.showToast('Sync failed: ' + error.message, 'danger');
        }
    }
    
    async saveCourse() {
        try {
            const title = document.getElementById('courseTitle').value.trim();
            const description = document.getElementById('courseDescription').value.trim();
            
            if (!title) {
                alert('Course title is required');
                return;
            }
            
            const token = await auth.getToken();
            if (!token) {
                EduUtils.showToast('Please login first', 'warning');
                return;
            }
            
            const courseData = {
                title,
                description,
                isPublished: true,
                createdBy: auth.currentUser.uid,
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                telegramChannelId: TELEGRAM_CONFIG.publicChannelId
            };
            
            await this.db.collection('courses').add(courseData);
            
            // Close modal
            const modal = bootstrap.Modal.getInstance(document.getElementById('createCourseModal'));
            modal.hide();
            
            // Reset form
            document.getElementById('courseForm').reset();
            
            // Reload courses
            this.loadDashboard();
            
            EduUtils.showToast('Course created successfully', 'success');
            
        } catch (error) {
            console.error('Save course error:', error);
            EduUtils.showToast('Failed to create course: ' + error.message, 'danger');
        }
    }
    
    async editCourse(courseId) {
        const course = this.courses.find(c => c.id === courseId);
        if (!course) return;
        
        document.getElementById('courseTitle').value = course.title;
        document.getElementById('courseDescription').value = course.description || '';
        
        const modal = new bootstrap.Modal(document.getElementById('createCourseModal'));
        modal.show();
        
        // Change modal for editing
        document.querySelector('#createCourseModal .modal-title').innerHTML = 
            '<i class="fas fa-edit"></i> Edit Course';
        document.querySelector('#createCourseModal .modal-footer button.btn-primary').innerHTML = 
            '<i class="fas fa-save"></i> Update Course';
        
        // Store course ID for update
        document.getElementById('createCourseModal').dataset.courseId = courseId;
    }
}

// Helper functions
function showCreateCourse() {
    const modal = new bootstrap.Modal(document.getElementById('createCourseModal'));
    modal.show();
    
    // Reset modal for creation
    document.querySelector('#createCourseModal .modal-title').innerHTML = 
        '<i class="fas fa-plus"></i> Create Course';
    document.querySelector('#createCourseModal .modal-footer button.btn-primary').innerHTML = 
        '<i class="fas fa-save"></i> Create Course';
    document.getElementById('courseForm').reset();
    delete document.getElementById('createCourseModal').dataset.courseId;
}

function syncTelegramFiles() {
    if (window.adminPanel) {
        window.adminPanel.syncTelegramFiles();
    }
}

function saveCourse() {
    if (window.adminPanel) {
        window.adminPanel.saveCourse();
    }
}

function loadCourses() {
    if (window.adminPanel) {
        window.adminPanel.loadCourses();
    }
}

function editCourse(courseId) {
    if (window.adminPanel) {
        window.adminPanel.editCourse(courseId);
    }
}

// Initialize
let adminPanel = null;
document.addEventListener('DOMContentLoaded', function() {
    adminPanel = new AdminPanel();
    window.adminPanel = adminPanel;
});
