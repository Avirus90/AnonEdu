// Admin Panel JavaScript - FIXED VERSION
class AdminPanel {
    constructor() {
        this.courses = [];
        this.initFirestore();
    }
    
    initFirestore() {
        try {
            if (!firebase.apps.length) {
                firebase.initializeApp(FIREBASE_CONFIG);
            }
            this.db = firebase.firestore();
            console.log('✅ Firestore initialized');
        } catch (error) {
            console.error('Firestore init error:', error);
        }
    }
    
    async loadDashboard() {
        try {
            EduUtils.showLoading(true);
            
            // Load courses count
            const coursesSnap = await this.db.collection('courses').get();
            document.getElementById('totalCourses').textContent = coursesSnap.size;
            
            // Load content count
            const contentSnap = await this.db.collection('courseContent').get();
            document.getElementById('totalContent').textContent = contentSnap.size;
            
            // Load users count from auth (demo)
            document.getElementById('totalStudents').textContent = '1';
            
            // Load Telegram files count
            await this.loadTelegramFilesCount();
            
            // Load courses list
            await this.loadCourses();
            
            EduUtils.showToast('Dashboard loaded successfully', 'success');
            
        } catch (error) {
            console.error('Dashboard load error:', error);
            EduUtils.showToast('Failed to load dashboard', 'danger');
        } finally {
            EduUtils.showLoading(false);
        }
    }
    
    async loadTelegramFilesCount() {
        try {
            const response = await fetch(`${BACKEND_URL}/api/files`);
            if (response.ok) {
                const data = await response.json();
                const fileCount = data.total_files || data.files?.length || 0;
                document.getElementById('telegramFiles').textContent = fileCount;
                console.log(`📊 Telegram files: ${fileCount}`);
            } else {
                console.log('Telegram API response not OK');
                document.getElementById('telegramFiles').textContent = '0';
            }
        } catch (error) {
            console.log('Telegram files count error:', error);
            document.getElementById('telegramFiles').textContent = '0';
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
                
                const date = course.createdAt ? 
                    new Date(course.createdAt.seconds * 1000).toLocaleDateString('hi-IN') : 
                    'Unknown date';
                
                html += `
                    <div class="col-md-6 mb-3">
                        <div class="card h-100 border-primary">
                            <div class="card-body">
                                <h5 class="card-title text-primary">${course.title}</h5>
                                <p class="card-text text-muted">${course.description || 'No description'}</p>
                                <div class="d-flex justify-content-between align-items-center">
                                    <small class="text-muted">
                                        <i class="far fa-calendar"></i> ${date}
                                    </small>
                                    <div class="btn-group btn-group-sm">
                                        <button class="btn btn-outline-warning" 
                                                onclick="editCourse('${course.id}')">
                                            <i class="fas fa-edit"></i> Edit
                                        </button>
                                        <button class="btn btn-outline-success ms-1"
                                                onclick="syncCourseToTelegram('${course.id}')">
                                            <i class="fab fa-telegram"></i> Sync
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
            EduUtils.showLoading(true);
            
            // First, check if we have a course
            const coursesSnap = await this.db.collection('courses').get();
            if (coursesSnap.empty) {
                alert('Please create a course first');
                showCreateCourse();
                return;
            }
            
            // Use first course for sync
            const courseId = coursesSnap.docs[0].id;
            const courseName = coursesSnap.docs[0].data().title;
            
            if (!confirm(`Sync Telegram files to course: "${courseName}"?`)) return;
            
            EduUtils.showToast('Syncing files from Telegram...', 'info');
            
            const response = await fetch(`${BACKEND_URL}/api/admin/sync-telegram`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ 
                    courseId: courseId,
                    channelId: TELEGRAM_CONFIG.publicChannelId 
                })
            });
            
            const data = await response.json();
            
            if (response.ok && data.success) {
                // Save files to Firestore
                if (data.files && data.files.length > 0) {
                    for (const file of data.files) {
                        await this.db.collection('courseContent').add(file);
                    }
                }
                
                EduUtils.showToast(`Synced ${data.synced || data.files?.length || 0} files from Telegram`, 'success');
                this.loadDashboard();
            } else {
                throw new Error(data.error || 'Sync failed');
            }
            
        } catch (error) {
            console.error('Sync error:', error);
            EduUtils.showToast('Sync failed: ' + error.message, 'danger');
        } finally {
            EduUtils.showLoading(false);
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
            
            EduUtils.showLoading(true);
            
            const courseData = {
                title,
                description,
                isPublished: true,
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
            await this.loadDashboard();
            
            EduUtils.showToast('Course created successfully', 'success');
            
        } catch (error) {
            console.error('Save course error:', error);
            EduUtils.showToast('Failed to create course: ' + error.message, 'danger');
        } finally {
            EduUtils.showLoading(false);
        }
    }
    
    async editCourse(courseId) {
        const course = this.courses.find(c => c.id === courseId);
        if (!course) return;
        
        document.getElementById('courseTitle').value = course.title;
        document.getElementById('courseDescription').value = course.description || '';
        
        const modal = new bootstrap.Modal(document.getElementById('createCourseModal'));
        
        // Change modal for editing
        document.querySelector('#createCourseModal .modal-title').innerHTML = 
            '<i class="fas fa-edit"></i> Edit Course';
        document.querySelector('#createCourseModal .modal-footer button.btn-primary').innerHTML = 
            '<i class="fas fa-save"></i> Update Course';
        
        // Store course ID for update
        document.getElementById('createCourseModal').dataset.courseId = courseId;
        modal.show();
    }
    
    async updateCourse(courseId) {
        try {
            const title = document.getElementById('courseTitle').value.trim();
            const description = document.getElementById('courseDescription').value.trim();
            
            if (!title) {
                alert('Course title is required');
                return;
            }
            
            EduUtils.showLoading(true);
            
            await this.db.collection('courses').doc(courseId).update({
                title,
                description,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            
            const modal = bootstrap.Modal.getInstance(document.getElementById('createCourseModal'));
            modal.hide();
            
            document.getElementById('courseForm').reset();
            delete document.getElementById('createCourseModal').dataset.courseId;
            
            await this.loadDashboard();
            
            EduUtils.showToast('Course updated successfully', 'success');
            
        } catch (error) {
            console.error('Update course error:', error);
            EduUtils.showToast('Failed to update course: ' + error.message, 'danger');
        } finally {
            EduUtils.showLoading(false);
        }
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
    const modal = document.getElementById('createCourseModal');
    const courseId = modal.dataset.courseId;
    
    if (window.adminPanel) {
        if (courseId) {
            window.adminPanel.updateCourse(courseId);
        } else {
            window.adminPanel.saveCourse();
        }
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

function syncCourseToTelegram(courseId) {
    if (window.adminPanel) {
        window.adminPanel.syncTelegramFiles();
    }
}

// Initialize
let adminPanel = null;
document.addEventListener('DOMContentLoaded', function() {
    // Wait for auth to initialize
    setTimeout(() => {
        checkAdminAccess();
        initializeAdminPanel();
    }, 1500);
});

function checkAdminAccess() {
    if (!window.auth || !window.auth.currentUser) {
        window.location.href = '../index.html';
        return;
    }
    
    const email = window.auth.currentUser.email;
    if (email !== ADMIN_EMAIL) {
        alert('Access Denied: Admin only');
        window.location.href = '../index.html';
    }
}

function initializeAdminPanel() {
    adminPanel = new AdminPanel();
    window.adminPanel = adminPanel;
    
    // Load dashboard after a delay
    setTimeout(() => {
        adminPanel.loadDashboard();
    }, 1000);
}
