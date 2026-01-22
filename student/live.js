// Live Class System with Whiteboard and Audio
class LiveClassSystem {
    constructor() {
        this.sessionId = this.getSessionId();
        this.userId = auth?.currentUser?.uid || 'demo_' + Math.random().toString(36).substr(2, 9);
        this.userName = this.getUserName();
        this.isTeacher = this.checkIfTeacher();
        this.micEnabled = this.isTeacher; // Teacher mic ON by default
        this.audioStream = null;
        this.peerConnections = {};
        this.whiteboard = null;
        this.isDrawing = false;
        this.currentTool = 'pencil';
        this.currentColor = '#000000';
        this.currentBrushSize = 3;
        this.lastSyncTime = Date.now();
        this.syncInterval = null;
        this.chatMessages = [];
        this.participants = {};
        this.raisedHands = new Set();
        
        this.initFirebase();
        this.initWhiteboard();
        this.setupEventListeners();
    }
    
    getSessionId() {
        // Get session ID from URL or create new
        const urlParams = new URLSearchParams(window.location.search);
        return urlParams.get('session') || 'default_session';
    }
    
    getUserName() {
        if (auth?.currentUser) {
            return auth.currentUser.email.split('@')[0];
        }
        return 'Student_' + Math.floor(Math.random() * 1000);
    }
    
    checkIfTeacher() {
        return auth?.currentUser?.email === ADMIN_EMAIL;
    }
    
    initFirebase() {
        if (!firebase.apps.length) {
            firebase.initializeApp(FIREBASE_CONFIG);
        }
        this.db = firebase.firestore();
        
        // Listen for whiteboard updates
        this.setupWhiteboardListener();
        
        // Listen for chat messages
        this.setupChatListener();
        
        // Listen for participants
        this.setupParticipantsListener();
    }
    
    async setupWhiteboardListener() {
        this.whiteboardUnsubscribe = this.db.collection('liveSessions')
            .doc(this.sessionId)
            .onSnapshot((doc) => {
                if (doc.exists) {
                    const data = doc.data();
                    if (data.whiteboardData && data.whiteboardData.lines) {
                        this.updateWhiteboardFromFirestore(data.whiteboardData);
                    }
                    
                    // Update participant count
                    if (data.participantCount) {
                        document.getElementById('participantNumber').textContent = data.participantCount;
                        document.getElementById('liveParticipantsCount').textContent = data.participantCount;
                    }
                    
                    // Update last sync time
                    this.lastSyncTime = Date.now();
                    this.updateSyncStatus();
                }
            });
        
        // Initial session data
        await this.initializeSession();
    }
    
    async initializeSession() {
        try {
            const sessionRef = this.db.collection('liveSessions').doc(this.sessionId);
            const sessionDoc = await sessionRef.get();
            
            if (!sessionDoc.exists) {
                // Create new session
                await sessionRef.set({
                    title: 'Live Mathematics Class',
                    description: 'Interactive algebra session with whiteboard',
                    isActive: true,
                    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                    createdBy: this.userId,
                    participantCount: 1,
                    whiteboardData: {
                        lines: [],
                        lastUpdated: firebase.firestore.FieldValue.serverTimestamp(),
                        lastUpdatedBy: this.userId
                    }
                });
            } else {
                // Update participant count
                await sessionRef.update({
                    participantCount: firebase.firestore.FieldValue.increment(1)
                });
            }
            
            // Add user to participants
            await this.addParticipant();
            
        } catch (error) {
            console.error('Session init error:', error);
        }
    }
    
    async addParticipant() {
        try {
            const participantRef = this.db.collection('liveParticipants')
                .doc(`${this.sessionId}_${this.userId}`);
            
            await participantRef.set({
                sessionId: this.sessionId,
                userId: this.userId,
                userName: this.userName,
                isTeacher: this.isTeacher,
                joinedAt: firebase.firestore.FieldValue.serverTimestamp(),
                isActive: true,
                micEnabled: this.micEnabled,
                raisedHand: false
            });
            
            // Update participant list locally
            this.participants[this.userId] = {
                name: this.userName,
                isTeacher: this.isTeacher,
                micEnabled: this.micEnabled
            };
            
            this.updateParticipantsUI();
            
        } catch (error) {
            console.error('Add participant error:', error);
        }
    }
    
    setupParticipantsListener() {
        this.participantsUnsubscribe = this.db.collection('liveParticipants')
            .where('sessionId', '==', this.sessionId)
            .onSnapshot((snapshot) => {
                this.participants = {};
                snapshot.forEach((doc) => {
                    const data = doc.data();
                    this.participants[data.userId] = {
                        name: data.userName,
                        isTeacher: data.isTeacher,
                        micEnabled: data.micEnabled,
                        raisedHand: data.raisedHand || false
                    };
                });
                
                this.updateParticipantsUI();
            });
    }
    
    updateParticipantsUI() {
        const participantsList = document.getElementById('participantsList');
        let html = '';
        
        Object.entries(this.participants).forEach(([userId, participant]) => {
            const isCurrentUser = userId === this.userId;
            const avatarText = participant.name.charAt(0).toUpperCase();
            
            html += `
                <div class="participant-item">
                    <div class="participant-avatar" style="background: ${this.getColorForUser(userId)};">
                        ${avatarText}
                    </div>
                    <div>
                        <strong>${participant.name} ${isCurrentUser ? '(You)' : ''}</strong>
                        <div class="d-flex align-items-center">
                            ${participant.micEnabled ? 
                                `<span class="recording-indicator"></span>
                                 <small class="text-success">Speaking</small>` : 
                                `<small class="text-muted">Mic off</small>`}
                            ${participant.raisedHand ? 
                                `<i class="fas fa-hand-paper text-warning ms-2" title="Hand raised"></i>` : ''}
                        </div>
                    </div>
                    <div class="ms-auto">
                        ${participant.isTeacher ? 
                            `<span class="badge bg-primary">Teacher</span>` : 
                            `<span class="badge bg-secondary">Student</span>`}
                    </div>
                </div>
            `;
        });
        
        participantsList.innerHTML = html;
        document.getElementById('participantNumber').textContent = Object.keys(this.participants).length;
        document.getElementById('liveParticipantsCount').textContent = Object.keys(this.participants).length;
    }
    
    getColorForUser(userId) {
        // Generate consistent color for each user
        const colors = [
            '#3498db', '#e74c3c', '#27ae60', '#f39c12', 
            '#9b59b6', '#1abc9c', '#d35400', '#c0392b'
        ];
        
        let hash = 0;
        for (let i = 0; i < userId.length; i++) {
            hash = userId.charCodeAt(i) + ((hash << 5) - hash);
        }
        
        return colors[Math.abs(hash) % colors.length];
    }
    
    setupChatListener() {
        this.chatUnsubscribe = this.db.collection('liveChat')
            .where('sessionId', '==', this.sessionId)
            .orderBy('timestamp', 'asc')
            .limit(50)
            .onSnapshot((snapshot) => {
                snapshot.docChanges().forEach((change) => {
                    if (change.type === 'added') {
                        const message = change.doc.data();
                        this.addChatMessage(message);
                    }
                });
            });
    }
    
    async sendMessage() {
        const input = document.getElementById('chatInput');
        const messageText = input.value.trim();
        
        if (!messageText) return;
        
        try {
            await this.db.collection('liveChat').add({
                sessionId: this.sessionId,
                userId: this.userId,
                userName: this.userName,
                message: messageText,
                timestamp: firebase.firestore.FieldValue.serverTimestamp(),
                isSystem: false
            });
            
            input.value = '';
            
        } catch (error) {
            console.error('Send message error:', error);
            alert('Failed to send message');
        }
    }
    
    addChatMessage(message) {
        this.chatMessages.push(message);
        
        const chatMessagesDiv = document.getElementById('chatMessages');
        const isOwnMessage = message.userId === this.userId;
        const isSystem = message.isSystem;
        
        let messageClass = 'message-received';
        if (isOwnMessage) messageClass = 'message-sent';
        if (isSystem) messageClass = 'message-system';
        
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${messageClass}`;
        
        if (isSystem) {
            messageDiv.innerHTML = message.message;
        } else {
            messageDiv.innerHTML = `<strong>${message.userName}:</strong> ${message.message}`;
        }
        
        chatMessagesDiv.appendChild(messageDiv);
        
        // Scroll to bottom
        chatMessagesDiv.scrollTop = chatMessagesDiv.scrollHeight;
    }
    
    // WHITEBOARD FUNCTIONS
    initWhiteboard() {
        const canvas = document.getElementById('whiteboard');
        this.whiteboard = new fabric.Canvas(canvas, {
            isDrawingMode: true,
            width: canvas.parentElement.clientWidth,
            height: canvas.parentElement.clientHeight,
            backgroundColor: '#ffffff'
        });
        
        // Set initial drawing properties
        this.whiteboard.freeDrawingBrush.width = this.currentBrushSize;
        this.whiteboard.freeDrawingBrush.color = this.currentColor;
        
        // Handle whiteboard changes
        this.whiteboard.on('path:created', (e) => {
            this.handleDrawing(e.path);
        });
        
        this.whiteboard.on('object:modified', (e) => {
            this.handleObjectModification(e.target);
        });
        
        this.whiteboard.on('object:removed', (e) => {
            this.handleObjectRemoval(e.target);
        });
        
        // Handle window resize
        window.addEventListener('resize', () => {
            this.resizeWhiteboard();
        });
        
        // Start sync interval
        this.startSyncInterval();
    }
    
    resizeWhiteboard() {
        const container = document.querySelector('.whiteboard-container');
        this.whiteboard.setDimensions({
            width: container.clientWidth,
            height: container.clientHeight
        });
        this.whiteboard.renderAll();
    }
    
    handleDrawing(path) {
        const drawingData = {
            type: 'drawing',
            tool: this.currentTool,
            color: this.currentColor,
            brushSize: this.currentBrushSize,
            points: path.path.map(p => [p[1], p[2]]),
            timestamp: Date.now(),
            userId: this.userId
        };
        
        this.saveDrawingToFirestore(drawingData);
    }
    
    handleObjectModification(obj) {
        if (obj.type === 'path') return; // Already handled by path:created
        
        const objectData = this.serializeObject(obj);
        this.saveObjectToFirestore(objectData);
    }
    
    handleObjectRemoval(obj) {
        // Mark object as removed in Firestore
        this.removeObjectFromFirestore(obj.id || obj._id);
    }
    
    serializeObject(obj) {
        return {
            id: obj.id || obj._id,
            type: obj.type,
            left: obj.left,
            top: obj.top,
            width: obj.width,
            height: obj.height,
            angle: obj.angle,
            scaleX: obj.scaleX,
            scaleY: obj.scaleY,
            fill: obj.fill,
            stroke: obj.stroke,
            strokeWidth: obj.strokeWidth,
            text: obj.text || '',
            fontSize: obj.fontSize,
            timestamp: Date.now(),
            userId: this.userId
        };
    }
    
    async saveDrawingToFirestore(drawingData) {
        try {
            const sessionRef = this.db.collection('liveSessions').doc(this.sessionId);
            
            await sessionRef.update({
                'whiteboardData.lines': firebase.firestore.FieldValue.arrayUnion(drawingData),
                'whiteboardData.lastUpdated': firebase.firestore.FieldValue.serverTimestamp(),
                'whiteboardData.lastUpdatedBy': this.userId
            });
            
        } catch (error) {
            console.error('Save drawing error:', error);
        }
    }
    
    async saveObjectToFirestore(objectData) {
        try {
            // Store individual object updates
            await this.db.collection('whiteboardObjects')
                .doc(`${this.sessionId}_${objectData.id}`)
                .set(objectData, { merge: true });
                
        } catch (error) {
            console.error('Save object error:', error);
        }
    }
    
    async removeObjectFromFirestore(objectId) {
        try {
            await this.db.collection('whiteboardObjects')
                .doc(`${this.sessionId}_${objectId}`)
                .update({ removed: true });
                
        } catch (error) {
            console.error('Remove object error:', error);
        }
    }
    
    updateWhiteboardFromFirestore(whiteboardData) {
        if (!whiteboardData || !whiteboardData.lines) return;
        
        // Only update if data is newer than our last sync
        const lastUpdate = whiteboardData.lastUpdated?.toDate()?.getTime() || 0;
        if (lastUpdate <= this.lastSyncTime) return;
        
        // Clear and redraw
        this.whiteboard.clear();
        
        whiteboardData.lines.forEach(line => {
            if (line.type === 'drawing') {
                this.drawLine(line);
            } else {
                this.drawObject(line);
            }
        });
        
        this.lastSyncTime = Date.now();
        this.updateSyncStatus();
    }
    
    drawLine(lineData) {
        const path = new fabric.Path(lineData.points.map(p => `L ${p[0]} ${p[1]}`).join(' '), {
            stroke: lineData.color,
            strokeWidth: lineData.brushSize,
            fill: null,
            selectable: false
        });
        
        this.whiteboard.add(path);
    }
    
    drawObject(objData) {
        let fabricObj;
        
        switch (objData.type) {
            case 'rect':
                fabricObj = new fabric.Rect({
                    left: objData.left,
                    top: objData.top,
                    width: objData.width,
                    height: objData.height,
                    fill: objData.fill,
                    stroke: objData.stroke,
                    strokeWidth: objData.strokeWidth
                });
                break;
                
            case 'circle':
                fabricObj = new fabric.Circle({
                    left: objData.left,
                    top: objData.top,
                    radius: objData.width / 2,
                    fill: objData.fill,
                    stroke: objData.stroke,
                    strokeWidth: objData.strokeWidth
                });
                break;
                
            case 'text':
                fabricObj = new fabric.Text(objData.text, {
                    left: objData.left,
                    top: objData.top,
                    fontSize: objData.fontSize,
                    fill: objData.fill
                });
                break;
                
            case 'line':
                fabricObj = new fabric.Line([
                    objData.x1, objData.y1,
                    objData.x2, objData.y2
                ], {
                    stroke: objData.stroke,
                    strokeWidth: objData.strokeWidth
                });
                break;
        }
        
        if (fabricObj) {
            this.whiteboard.add(fabricObj);
        }
    }
    
    startSyncInterval() {
        this.syncInterval = setInterval(() => {
            this.updateSyncStatus();
        }, 5000);
    }
    
    updateSyncStatus() {
        const timeDiff = Date.now() - this.lastSyncTime;
        const syncStatus = document.getElementById('syncStatus');
        const lastSync = document.getElementById('lastSync');
        
        if (timeDiff < 3000) {
            syncStatus.textContent = 'Synced';
            syncStatus.style.color = '#27ae60';
            lastSync.textContent = 'Last sync: Just now';
        } else if (timeDiff < 10000) {
            syncStatus.textContent = 'Syncing...';
            syncStatus.style.color = '#f39c12';
            lastSync.textContent = `Last sync: ${Math.round(timeDiff/1000)}s ago`;
        } else {
            syncStatus.textContent = 'Connection issue';
            syncStatus.style.color = '#e74c3c';
            lastSync.textContent = 'Last sync: Connection lost';
        }
    }
    
    // TOOL FUNCTIONS
    setupEventListeners() {
        // Tool selection
        document.querySelectorAll('.tool-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const tool = e.currentTarget.dataset.tool;
                this.selectTool(tool);
            });
        });
        
        // Color selection
        document.querySelectorAll('.color-option').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const color = e.currentTarget.dataset.color;
                this.selectColor(color);
            });
        });
        
        // Brush size selection
        document.querySelectorAll('.size-option').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const size = parseInt(e.currentTarget.dataset.size);
                this.selectBrushSize(size);
            });
        });
        
        // Chat input
        document.getElementById('chatInput').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.sendMessage();
            }
        });
    }
    
    selectTool(tool) {
        this.currentTool = tool;
        
        // Update UI
        document.querySelectorAll('.tool-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        document.querySelector(`[data-tool="${tool}"]`).classList.add('active');
        
        // Update fabric.js
        switch (tool) {
            case 'pencil':
                this.whiteboard.isDrawingMode = true;
                this.whiteboard.freeDrawingBrush = new fabric.PencilBrush(this.whiteboard);
                break;
                
            case 'line':
                this.whiteboard.isDrawingMode = false;
                // Line tool logic would go here
                break;
                
            case 'rectangle':
                this.whiteboard.isDrawingMode = false;
                // Rectangle tool logic
                break;
                
            case 'circle':
                this.whiteboard.isDrawingMode = false;
                // Circle tool logic
                break;
                
            case 'text':
                this.whiteboard.isDrawingMode = false;
                // Text tool logic
                break;
                
            case 'eraser':
                this.whiteboard.isDrawingMode = false;
                // Eraser tool logic
                break;
                
            case 'select':
                this.whiteboard.isDrawingMode = false;
                break;
                
            case 'clear':
                this.clearWhiteboard();
                break;
        }
        
        // Update brush properties
        if (this.whiteboard.isDrawingMode) {
            this.whiteboard.freeDrawingBrush.width = this.currentBrushSize;
            this.whiteboard.freeDrawingBrush.color = this.currentColor;
        }
    }
    
    selectColor(color) {
        this.currentColor = color;
        
        // Update UI
        document.querySelectorAll('.color-option').forEach(btn => {
            btn.classList.remove('active');
        });
        document.querySelector(`[data-color="${color}"]`).classList.add('active');
        
        // Update fabric brush
        if (this.whiteboard.isDrawingMode) {
            this.whiteboard.freeDrawingBrush.color = color;
        }
    }
    
    selectBrushSize(size) {
        this.currentBrushSize = size;
        
        // Update UI
        document.querySelectorAll('.size-option').forEach(btn => {
            btn.classList.remove('active');
        });
        document.querySelector(`[data-size="${size}"]`).classList.add('active');
        
        // Update fabric brush
        if (this.whiteboard.isDrawingMode) {
            this.whiteboard.freeDrawingBrush.width = size;
        }
    }
    
    clearWhiteboard() {
        if (confirm('Clear the entire whiteboard?')) {
            this.whiteboard.clear();
            
            // Also clear from Firestore
            this.db.collection('liveSessions').doc(this.sessionId).update({
                'whiteboardData.lines': [],
                'whiteboardData.lastUpdated': firebase.firestore.FieldValue.serverTimestamp(),
                'whiteboardData.lastUpdatedBy': this.userId
            });
        }
    }
    
    // AUDIO FUNCTIONS
    async initializeAudio(enableMic = false) {
        try {
            if (enableMic) {
                await this.requestMicrophone();
                this.micEnabled = true;
                this.updateMicUI();
            }
            
            // For WebRTC implementation, you would set up peer connections here
            // This is simplified for the free-tier version
            
        } catch (error) {
            console.error('Audio init error:', error);
            alert('Microphone access denied. You can still participate in chat and whiteboard.');
        }
    }
    
    async requestMicrophone() {
        this.audioStream = await navigator.mediaDevices.getUserMedia({
            audio: {
                echoCancellation: true,
                noiseSuppression: true,
                autoGainControl: true
            },
            video: false
        });
        
        // For actual audio sharing, you would use WebRTC here
        // This is a simplified version for free tier
        
        console.log('Microphone access granted');
    }
    
    async toggleMicrophone() {
        if (this.micEnabled) {
            await this.disableMicrophone();
        } else {
            await this.enableMicrophone();
        }
        
        this.updateMicUI();
        
        // Update participant status in Firestore
        await this.updateParticipantMicStatus();
    }
    
    async enableMicrophone() {
        try {
            await this.requestMicrophone();
            this.micEnabled = true;
            
            // Send system message
            await this.sendSystemMessage(`${this.userName} turned on microphone`);
            
        } catch (error) {
            console.error('Enable mic error:', error);
            alert('Failed to enable microphone: ' + error.message);
        }
    }
    
    async disableMicrophone() {
        if (this.audioStream) {
            this.audioStream.getTracks().forEach(track => track.stop());
            this.audioStream = null;
        }
        
        this.micEnabled = false;
        
        // Send system message
        await this.sendSystemMessage(`${this.userName} turned off microphone`);
    }
    
    updateMicUI() {
        const micBtn = document.getElementById('micToggleBtn');
        const micStatus = document.getElementById('micStatus');
        
        if (this.micEnabled) {
            micBtn.className = 'mic-btn mic-on';
            micBtn.innerHTML = '<i class="fas fa-microphone"></i>';
            micStatus.textContent = 'Microphone: ON';
            micStatus.className = 'text-success';
        } else {
            micBtn.className = 'mic-btn mic-off';
            micBtn.innerHTML = '<i class="fas fa-microphone-slash"></i>';
            micStatus.textContent = 'Microphone: OFF';
            micStatus.className = 'text-danger';
        }
    }
    
    async updateParticipantMicStatus() {
        try {
            await this.db.collection('liveParticipants')
                .doc(`${this.sessionId}_${this.userId}`)
                .update({
                    micEnabled: this.micEnabled,
                    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                });
                
        } catch (error) {
            console.error('Update participant mic error:', error);
        }
    }
    
    async toggleRaiseHand() {
        try {
            const participantRef = this.db.collection('liveParticipants')
                .doc(`${this.sessionId}_${this.userId}`);
                
            const participantDoc = await participantRef.get();
            const currentRaisedHand = participantDoc.data()?.raisedHand || false;
            
            await participantRef.update({
                raisedHand: !currentRaisedHand,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            
            // Send system message
            if (!currentRaisedHand) {
                await this.sendSystemMessage(`${this.userName} raised their hand`);
            }
            
            // Update button UI
            const raiseHandBtn = document.getElementById('raiseHandBtn');
            if (!currentRaisedHand) {
                raiseHandBtn.classList.add('hand-raise-btn');
                raiseHandBtn.innerHTML = '<i class="fas fa-hand-paper"></i> Lower Hand';
            } else {
                raiseHandBtn.classList.remove('hand-raise-btn');
                raiseHandBtn.innerHTML = '<i class="fas fa-hand-paper"></i> Raise Hand';
            }
            
        } catch (error) {
            console.error('Toggle raise hand error:', error);
        }
    }
    
    async sendSystemMessage(message) {
        try {
            await this.db.collection('liveChat').add({
                sessionId: this.sessionId,
                userId: 'system',
                userName: 'System',
                message: message,
                timestamp: firebase.firestore.FieldValue.serverTimestamp(),
                isSystem: true
            });
        } catch (error) {
            console.error('Send system message error:', error);
        }
    }
    
    adjustVolume(volume) {
        // This would adjust peer audio volume in a full WebRTC implementation
        console.log('Volume adjusted to:', volume);
    }
    
    // TEACHER CONTROLS
    async clearAllWhiteboards() {
        if (!this.isTeacher) return;
        
        if (confirm('Clear whiteboard for all participants?')) {
            await this.db.collection('liveSessions').doc(this.sessionId).update({
                'whiteboardData.lines': [],
                'whiteboardData.lastUpdated': firebase.firestore.FieldValue.serverTimestamp(),
                'whiteboardData.lastUpdatedBy': this.userId
            });
            
            await this.sendSystemMessage('Teacher cleared the whiteboard');
        }
    }
    
    async lockWhiteboard() {
        if (!this.isTeacher) return;
        
        // This would lock student whiteboards in a full implementation
        await this.sendSystemMessage('Teacher locked the whiteboard (students can view only)');
    }
    
    async shareScreen() {
        if (!this.isTeacher) return;
        
        try {
            // Request screen share
            const screenStream = await navigator.mediaDevices.getDisplayMedia({
                video: true,
                audio: false
            });
            
            // In a full implementation, this would be shared via WebRTC
            await this.sendSystemMessage('Teacher started screen sharing');
            
            // Handle screen share stop
            screenStream.getTracks()[0].onended = () => {
                this.sendSystemMessage('Teacher stopped screen sharing');
            };
            
        } catch (error) {
            console.error('Screen share error:', error);
        }
    }
    
    async recordSession() {
        if (!this.isTeacher) return;
        
        alert('Recording feature requires additional setup. Session data is automatically saved to Firestore.');
    }
    
    // CLEANUP
    async leaveClass() {
        if (confirm('Leave the live class?')) {
            // Stop audio
            if (this.audioStream) {
                this.audioStream.getTracks().forEach(track => track.stop());
            }
            
            // Remove participant
            await this.removeParticipant();
            
            // Update participant count
            await this.decrementParticipantCount();
            
            // Unsubscribe listeners
            if (this.whiteboardUnsubscribe) this.whiteboardUnsubscribe();
            if (this.chatUnsubscribe) this.chatUnsubscribe();
            if (this.participantsUnsubscribe) this.participantsUnsubscribe();
            
            // Clear intervals
            if (this.syncInterval) clearInterval(this.syncInterval);
            
            // Go back to student dashboard
            window.location.href = 'index.html';
        }
    }
    
    async removeParticipant() {
        try {
            await this.db.collection('liveParticipants')
                .doc(`${this.sessionId}_${this.userId}`)
                .delete();
                
        } catch (error) {
            console.error('Remove participant error:', error);
        }
    }
    
    async decrementParticipantCount() {
        try {
            await this.db.collection('liveSessions')
                .doc(this.sessionId)
                .update({
                    participantCount: firebase.firestore.FieldValue.increment(-1)
                });
                
        } catch (error) {
            console.error('Decrement participant count error:', error);
        }
    }
    
    // UTILITY FUNCTIONS
    openResources() {
        alert('Class resources would open here. Linked to Telegram files.');
    }
    
    handleChatKeyPress(event) {
        if (event.key === 'Enter') {
            this.sendMessage();
        }
    }
}

// Global functions for HTML onclick
function toggleMicrophone() {
    window.liveClass.toggleMicrophone();
}

function toggleRaiseHand() {
    window.liveClass.toggleRaiseHand();
}

function sendMessage() {
    window.liveClass.sendMessage();
}

function handleChatKeyPress(event) {
    window.liveClass.handleChatKeyPress(event);
}

function adjustVolume(value) {
    window.liveClass.adjustVolume(value);
}

function clearAllWhiteboards() {
    window.liveClass.clearAllWhiteboards();
}

function lockWhiteboard() {
    window.liveClass.lockWhiteboard();
}

function shareScreen() {
    window.liveClass.shareScreen();
}

function recordSession() {
    window.liveClass.recordSession();
}

function leaveClass() {
    window.liveClass.leaveClass();
}

function openResources() {
    window.liveClass.openResources();
}

// Initialize
let liveClass = null;
document.addEventListener('DOMContentLoaded', function() {
    liveClass = new LiveClassSystem();
    window.liveClass = liveClass;
    
    // Initial UI setup
    liveClass.updateMicUI();
    
    // Add welcome message
    setTimeout(() => {
        liveClass.sendSystemMessage(`${liveClass.userName} joined the class`);
    }, 1000);
});
