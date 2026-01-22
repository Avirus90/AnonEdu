// Admin Panel JavaScript
class AdminPanel {
    constructor() {
        this.courses = [];
        this.content = [];
        this.users = [];
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
            
            // Load Telegram files
            this.loadTelegramFilesCount();
            
            // Load courses list
            this.loadCourses();
            
        } catch (error) {
            console.error('Dashboard load error:', error);
            this.showError('Failed to load dashboard');
        }
    }
    
    async loadTelegramFilesCount() {
        try {
            const response = await fetch(`${BACKEND_URLS.active}/api/files`);
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
                                        Created: ${course.createdAt ? new Date(course.createdAt?.toDate()).toLocaleDateString() : 'N/A'}
                                    </small>
                                    <div class="btn-group btn-group-sm">
                                        <button class="btn btn-outline-primary" 
                                                onclick="adminPanel.viewCourse('${course.id}')">
                                            <i class="fas fa-eye"></i> View
                                        </button>
                                        <button class="btn btn-outline-warning" 
                                                onclick="adminPanel.editCourse('${course.id}')">
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
            this.showError('Failed to load courses');
        }
    }
    
    async syncTelegramFiles() {
        try {
            if (!confirm('Sync files from Telegram channel?')) return;
            
            const token = await eduAuth?.getToken();
            if (!token) throw new Error('Not authenticated');
            
            // First, check if we have a course
            const coursesSnap = await this.db.collection('courses').get();
            if (coursesSnap.empty) {
                alert('Please create a course first');
                showCreateCourse();
                return;
            }
            
            // Use first course for sync
            const courseId = coursesSnap.docs[0].id;
            
            const response = await fetch(`${BACKEND_URLS.active}/api/admin/sync-telegram`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ courseId })
            });
            
            if (response.ok) {
                const data = await response.json();
                alert(`Synced ${data.synced} files from Telegram`);
                this.loadDashboard();
            } else {
                throw new Error('Sync failed');
            }
            
        } catch (error) {
            console.error('Sync error:', error);
            alert('Sync failed: ' + error.message);
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
            
            const token = await eduAuth?.getToken();
            if (!token) throw new Error('Not authenticated');
            
            const courseData = {
                title,
                description,
                isPublished: true,
                createdBy: eduAuth.currentUser.uid,
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                telegramChannelId: '-1001973930631'
            };
            
            await this.db.collection('courses').add(courseData);
            
            // Close modal
            const modalElement = document.getElementById('createCourseModal');
            const modal = bootstrap.Modal.getInstance(modalElement);
            if (modal) modal.hide();
            
            // Reset form
            document.getElementById('courseForm').reset();
            
            // Reload courses
            this.loadDashboard();
            
            this.showSuccess('Course created successfully');
            
        } catch (error) {
            console.error('Save course error:', error);
            alert('Failed to create course: ' + error.message);
        }
    }
    
    async viewCourse(courseId) {
        // Save course ID to session
        sessionStorage.setItem('currentCourseId', courseId);
        alert('View course functionality will be implemented');
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
        document.querySelector('#createCourseModal .modal-footer button.btn-primary').setAttribute('onclick', `adminPanel.updateCourse('${courseId}')`);
    }
    
    async updateCourse(courseId) {
        try {
            const title = document.getElementById('courseTitle').value.trim();
            const description = document.getElementById('courseDescription').value.trim();
            
            if (!title) {
                alert('Course title is required');
                return;
            }
            
            await this.db.collection('courses').doc(courseId).update({
                title,
                description,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            
            // Close modal
            const modalElement = document.getElementById('createCourseModal');
            const modal = bootstrap.Modal.getInstance(modalElement);
            if (modal) modal.hide();
            
            // Reset form
            document.getElementById('courseForm').reset();
            
            // Reload courses
            this.loadDashboard();
            
            this.showSuccess('Course updated successfully');
            
        } catch (error) {
            console.error('Update course error:', error);
            alert('Failed to update course: ' + error.message);
        }
    }
    
    showError(message) {
        alert('Error: ' + message);
    }
    
    showSuccess(message) {
        alert('Success: ' + message);
    }
}

// Initialize
let adminPanel = null;
document.addEventListener('DOMContentLoaded', function() {
    adminPanel = new AdminPanel();
    window.adminPanel = adminPanel;
});
