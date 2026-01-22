// Mock Test System
class MockTestSystem {
    constructor() {
        this.currentTest = null;
        this.questions = [];
        this.userAnswers = {};
        this.markedForReview = new Set();
        this.currentQuestionIndex = 0;
        this.timerInterval = null;
        this.timeRemaining = 0;
        this.startTime = null;
        this.isTestActive = false;
        this.testResults = null;
    }
    
    async loadAvailableTests() {
        try {
            const testsList = document.getElementById('testsList');
            
            // Try to fetch tests from backend
            const response = await fetch(`${BACKEND_URL}/api/files`);
            
            if (!response.ok) {
                throw new Error('Failed to load tests');
            }
            
            const data = await response.json();
            const files = data.files || [];
            
            // Filter TXT files (mock tests)
            const txtFiles = files.filter(file => 
                file.name && file.name.toLowerCase().includes('.txt')
            );
            
            if (txtFiles.length === 0) {
                testsList.innerHTML = `
                    <div class="col-12 text-center py-5">
                        <i class="fas fa-file-alt fa-3x text-muted mb-3"></i>
                        <h5>No mock tests found</h5>
                        <p class="text-muted">Upload TXT files to Telegram channel to create tests</p>
                        <div class="mt-3">
                            <button class="btn btn-primary" onclick="loadSampleTest()">
                                <i class="fas fa-eye"></i> Try Sample Test
                            </button>
                        </div>
                    </div>
                `;
                return;
            }
            
            let html = '';
            txtFiles.forEach((file, index) => {
                html += `
                    <div class="col-md-4 mb-4">
                        <div class="card h-100">
                            <div class="card-body">
                                <h5 class="card-title">
                                    <i class="fas fa-file-alt text-primary"></i> 
                                    ${file.name.replace('.txt', '').replace(/_/g, ' ')}
                                </h5>
                                <p class="card-text text-muted">
                                    <i class="far fa-clock"></i> ${file.size ? Math.ceil(file.size / 1024) : 30} KB
                                </p>
                                <p class="card-text">
                                    <small class="text-muted">
                                        Estimated: ${Math.ceil((file.size || 1000) / 500)} questions
                                    </small>
                                </p>
                                <div class="d-grid">
                                    <button class="btn btn-primary" onclick="startTest('${file.id}')">
                                        <i class="fas fa-play"></i> Start Test
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                `;
            });
            
            testsList.innerHTML = html;
            
        } catch (error) {
            console.error('Load tests error:', error);
            document.getElementById('testsList').innerHTML = `
                <div class="col-12 text-center py-5">
                    <i class="fas fa-exclamation-triangle fa-3x text-danger mb-3"></i>
                    <h5>Failed to load tests</h5>
                    <p class="text-muted">${error.message}</p>
                    <div class="mt-3">
                        <button class="btn btn-primary" onclick="loadSampleTest()">
                            <i class="fas fa-eye"></i> Try Sample Test
                        </button>
                    </div>
                </div>
            `;
        }
    }
    
    async startTest(fileId) {
        try {
            // Show loading
            document.getElementById('testSelection').style.display = 'none';
            document.getElementById('testInterface').style.display = 'block';
            
            // Load test questions from backend
            const token = await auth?.getToken();
            const headers = token ? { 'Authorization': `Bearer ${token}` } : {};
            
            const response = await fetch(`${BACKEND_URL}/api/mock-test/${fileId}`, { headers });
            
            if (!response.ok) {
                throw new Error('Failed to load test questions');
            }
            
            const data = await response.json();
            
            if (!data.success || !data.questions || data.questions.length === 0) {
                throw new Error('No questions found in test file');
            }
            
            // Initialize test
            this.questions = data.questions;
            this.userAnswers = {};
            this.markedForReview.clear();
            this.currentQuestionIndex = 0;
            this.startTime = new Date();
            this.isTestActive = true;
            
            // Calculate test duration (1 minute per question)
            this.timeRemaining = this.questions.length * 60; // in seconds
            
            // Update UI
            document.getElementById('testTitle').textContent = `Mock Test - ${this.questions.length} Questions`;
            document.getElementById('testInfo').textContent = 
                `Time: ${Math.floor(this.timeRemaining / 60)} mins • Questions: ${this.questions.length}`;
            document.getElementById('totalQuestions').textContent = this.questions.length;
            
            // Start timer
            this.startTimer();
            
            // Load first question
            this.loadQuestion(this.currentQuestionIndex);
            
            // Create question palette
            this.createQuestionPalette();
            
        } catch (error) {
            console.error('Start test error:', error);
            alert('Failed to start test: ' + error.message);
            this.showTestSelection();
        }
    }
    
    startTimer() {
        this.updateTimerDisplay();
        
        this.timerInterval = setInterval(() => {
            this.timeRemaining--;
            this.updateTimerDisplay();
            
            if (this.timeRemaining <= 0) {
                this.submitTest();
            }
        }, 1000);
    }
    
    updateTimerDisplay() {
        const minutes = Math.floor(this.timeRemaining / 60);
        const seconds = this.timeRemaining % 60;
        const timerElement = document.getElementById('timer');
        
        timerElement.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        
        // Add warning class when less than 5 minutes
        if (this.timeRemaining < 300) { // 5 minutes
            timerElement.classList.add('warning');
        } else {
            timerElement.classList.remove('warning');
        }
    }
    
    loadQuestion(index) {
        if (index < 0 || index >= this.questions.length) return;
        
        this.currentQuestionIndex = index;
        const question = this.questions[index];
        
        // Update progress
        const progressPercent = Math.round(((index + 1) / this.questions.length) * 100);
        document.getElementById('testProgress').style.width = `${progressPercent}%`;
        document.getElementById('progressPercent').textContent = progressPercent;
        document.getElementById('currentQuestion').textContent = index + 1;
        
        // Update navigation buttons
        document.getElementById('prevBtn').disabled = index === 0;
        document.getElementById('nextBtn').innerHTML = 
            index === this.questions.length - 1 ? 
            'Submit <i class="fas fa-paper-plane"></i>' : 
            'Next <i class="fas fa-arrow-right"></i>';
        
        // Create question HTML
        let optionsHtml = '';
        const questionNumber = index + 1;
        const userAnswer = this.userAnswers[questionNumber];
        
        ['A', 'B', 'C', 'D'].forEach((optionLetter, optionIndex) => {
            if (optionIndex < question.options.length) {
                const optionText = question.options[optionIndex];
                const optionId = `q${questionNumber}_option${optionLetter}`;
                const isSelected = userAnswer === optionLetter;
                
                optionsHtml += `
                    <label class="option-label ${isSelected ? 'selected' : ''}" 
                           for="${optionId}">
                        <input type="radio" 
                               id="${optionId}"
                               name="q${questionNumber}" 
                               value="${optionLetter}"
                               ${isSelected ? 'checked' : ''}
                               onchange="testSystem.selectOption(${questionNumber}, '${optionLetter}')"
                               style="display: none;">
                        <strong>${optionLetter}.</strong> ${optionText}
                    </label>
                `;
            }
        });
        
        const isMarked = this.markedForReview.has(questionNumber);
        
        const questionHtml = `
            <div class="question-card active">
                <div class="d-flex justify-content-between align-items-start mb-3">
                    <h5>Question ${questionNumber}:</h5>
                    <button class="btn btn-sm ${isMarked ? 'btn-warning' : 'btn-outline-warning'}"
                            onclick="testSystem.toggleMarkReview(${questionNumber})">
                        <i class="far ${isMarked ? 'fa-flag' : 'fa-flag'}"></i>
                        ${isMarked ? 'Marked' : 'Mark for Review'}
                    </button>
                </div>
                <p class="lead">${question.question}</p>
                <div class="mt-4">
                    ${optionsHtml}
                </div>
            </div>
        `;
        
        document.getElementById('questionsContainer').innerHTML = questionHtml;
        
        // Update question palette
        this.updateQuestionPalette();
    }
    
    selectOption(questionNumber, optionLetter) {
        this.userAnswers[questionNumber] = optionLetter;
        
        // Update UI
        const questionElement = document.querySelector('.question-card.active');
        if (questionElement) {
            // Remove selected class from all options
            questionElement.querySelectorAll('.option-label').forEach(label => {
                label.classList.remove('selected');
            });
            
            // Add selected class to chosen option
            const selectedOption = questionElement.querySelector(`input[value="${optionLetter}"]`);
            if (selectedOption) {
                selectedOption.parentElement.classList.add('selected');
            }
        }
        
        // Update question palette
        this.updateQuestionPalette();
    }
    
    toggleMarkReview(questionNumber) {
        if (this.markedForReview.has(questionNumber)) {
            this.markedForReview.delete(questionNumber);
        } else {
            this.markedForReview.add(questionNumber);
        }
        
        // Reload current question to update UI
        this.loadQuestion(this.currentQuestionIndex);
    }
    
    createQuestionPalette() {
        const paletteElement = document.getElementById('questionPalette');
        let paletteHtml = '';
        
        for (let i = 0; i < this.questions.length; i++) {
            const questionNumber = i + 1;
            const isAnswered = this.userAnswers[questionNumber];
            const isMarked = this.markedForReview.has(questionNumber);
            const isCurrent = i === this.currentQuestionIndex;
            
            let btnClass = 'btn btn-outline-secondary';
            if (isCurrent) btnClass = 'btn btn-primary';
            else if (isAnswered) btnClass = 'btn btn-success';
            else if (isMarked) btnClass = 'btn btn-warning';
            
            paletteHtml += `
                <button class="btn ${btnClass} px-3 py-2"
                        onclick="testSystem.loadQuestion(${i})"
                        style="min-width: 45px;">
                    ${questionNumber}
                </button>
            `;
        }
        
        paletteElement.innerHTML = paletteHtml;
    }
    
    updateQuestionPalette() {
        const buttons = document.querySelectorAll('#questionPalette button');
        
        buttons.forEach((button, index) => {
            const questionNumber = index + 1;
            const isAnswered = this.userAnswers[questionNumber];
            const isMarked = this.markedForReview.has(questionNumber);
            const isCurrent = index === this.currentQuestionIndex;
            
            let btnClass = 'btn btn-outline-secondary';
            if (isCurrent) btnClass = 'btn btn-primary';
            else if (isAnswered) btnClass = 'btn btn-success';
            else if (isMarked) btnClass = 'btn btn-warning';
            
            button.className = `btn ${btnClass} px-3 py-2`;
        });
    }
    
    nextQuestion() {
        if (this.currentQuestionIndex < this.questions.length - 1) {
            this.loadQuestion(this.currentQuestionIndex + 1);
        } else {
            this.submitTest();
        }
    }
    
    prevQuestion() {
        if (this.currentQuestionIndex > 0) {
            this.loadQuestion(this.currentQuestionIndex - 1);
        }
    }
    
    async submitTest() {
        try {
            // Stop timer
            if (this.timerInterval) {
                clearInterval(this.timerInterval);
                this.timerInterval = null;
            }
            
            this.isTestActive = false;
            
            // Calculate results
            const results = this.calculateResults();
            this.testResults = results;
            
            // Show results screen
            this.showResults(results);
            
            // Save score if user is logged in
            if (auth && auth.currentUser) {
                await this.saveTestScore(results);
            }
            
        } catch (error) {
            console.error('Submit test error:', error);
        }
    }
    
    calculateResults() {
        let correct = 0;
        let wrong = 0;
        let skipped = 0;
        
        this.questions.forEach((question, index) => {
            const questionNumber = index + 1;
            const userAnswer = this.userAnswers[questionNumber];
            
            if (!userAnswer) {
                skipped++;
            } else if (userAnswer.toUpperCase() === question.answer) {
                correct++;
            } else {
                wrong++;
            }
        });
        
        const total = this.questions.length;
        const score = total > 0 ? Math.round((correct / total) * 100) : 0;
        
        // Calculate time taken
        const endTime = new Date();
        const timeTaken = Math.round((endTime - this.startTime) / 1000 / 60); // in minutes
        
        return {
            correct,
            wrong,
            skipped,
            total,
            score,
            timeTaken,
            answers: this.userAnswers
        };
    }
    
    showResults(results) {
        // Hide test interface
        document.getElementById('testInterface').style.display = 'none';
        document.getElementById('resultsScreen').style.display = 'block';
        
        // Update results UI
        document.getElementById('finalScore').textContent = `${results.score}%`;
        document.getElementById('correctAnswers').textContent = results.correct;
        document.getElementById('wrongAnswers').textContent = results.wrong;
        document.getElementById('skippedQuestions').textContent = results.skipped;
        document.getElementById('timeTaken').textContent = results.timeTaken;
        
        // Set result message
        const messageElement = document.getElementById('resultMessage');
        if (results.score >= 80) {
            messageElement.textContent = 'Excellent! You have mastered this topic.';
            messageElement.className = 'lead text-success';
        } else if (results.score >= 60) {
            messageElement.textContent = 'Good job! You have a good understanding.';
            messageElement.className = 'lead text-primary';
        } else if (results.score >= 40) {
            messageElement.textContent = 'Average score. Review the material and try again.';
            messageElement.className = 'lead text-warning';
        } else {
            messageElement.textContent = 'Needs improvement. Please study the material again.';
            messageElement.className = 'lead text-danger';
        }
        
        // Hide saving status after 3 seconds
        setTimeout(() => {
            document.getElementById('scoreSaveStatus').style.display = 'none';
        }, 3000);
    }
    
    async saveTestScore(results) {
        try {
            // This would save to Firebase in a real implementation
            // For now, we'll just log it
            console.log('Test results:', results);
            
            // Simulate saving
            setTimeout(() => {
                const statusElement = document.getElementById('scoreSaveStatus');
                statusElement.innerHTML = `
                    <div class="alert alert-success">
                        <i class="fas fa-check"></i> Score saved to your progress!
                    </div>
                `;
            }, 1000);
            
        } catch (error) {
            console.error('Save score error:', error);
        }
    }
    
    showTestSelection() {
        document.getElementById('testInterface').style.display = 'none';
        document.getElementById('resultsScreen').style.display = 'none';
        document.getElementById('testSelection').style.display = 'block';
    }
    
    // Demo/test functions
    async loadSampleTest() {
        // Create sample questions for demo
        const sampleQuestions = [
            {
                question: "What is the capital of France?",
                options: ["London", "Berlin", "Paris", "Madrid"],
                answer: "C"
            },
            {
                question: "Which planet is known as the Red Planet?",
                options: ["Earth", "Mars", "Jupiter", "Venus"],
                answer: "B"
            },
            {
                question: "What is 5 + 7?",
                options: ["10", "11", "12", "13"],
                answer: "C"
            },
            {
                question: "Who wrote 'Romeo and Juliet'?",
                options: ["Charles Dickens", "William Shakespeare", "Jane Austen", "Mark Twain"],
                answer: "B"
            },
            {
                question: "What is the chemical symbol for water?",
                options: ["H2O", "CO2", "O2", "NaCl"],
                answer: "A"
            }
        ];
        
        // Simulate starting a test
        this.questions = sampleQuestions;
        this.userAnswers = {};
        this.markedForReview.clear();
        this.currentQuestionIndex = 0;
        this.startTime = new Date();
        this.isTestActive = true;
        this.timeRemaining = 300; // 5 minutes for demo
        
        // Update UI
        document.getElementById('testSelection').style.display = 'none';
        document.getElementById('testInterface').style.display = 'block';
        document.getElementById('testTitle').textContent = 'Sample Test - 5 Questions';
        document.getElementById('testInfo').textContent = 'Time: 5 mins • Questions: 5';
        document.getElementById('totalQuestions').textContent = '5';
        
        // Start timer
        this.startTimer();
        
        // Load first question
        this.loadQuestion(this.currentQuestionIndex);
        this.createQuestionPalette();
    }
    
    reviewAnswers() {
        // This would show detailed review of answers
        alert('Review feature will be implemented in the next version.');
    }
    
    startNewTest() {
        this.showTestSelection();
        this.loadAvailableTests();
    }
    
    goToDashboard() {
        window.location.href = 'index.html';
    }
}

// Global functions for HTML onclick
function startTest(fileId) {
    window.testSystem.startTest(fileId);
}

function nextQuestion() {
    window.testSystem.nextQuestion();
}

function prevQuestion() {
    window.testSystem.prevQuestion();
}

function markForReview() {
    window.testSystem.toggleMarkReview(window.testSystem.currentQuestionIndex + 1);
}

function submitTest() {
    if (confirm('Are you sure you want to submit the test?')) {
        window.testSystem.submitTest();
    }
}

function loadSampleTest() {
    window.testSystem.loadSampleTest();
}

function reviewAnswers() {
    window.testSystem.reviewAnswers();
}

function startNewTest() {
    window.testSystem.startNewTest();
}

function goToDashboard() {
    window.testSystem.goToDashboard();
}

// Initialize
let testSystem = null;
document.addEventListener('DOMContentLoaded', function() {
    testSystem = new MockTestSystem();
    window.testSystem = testSystem;
    
    // Load available tests
    testSystem.loadAvailableTests();
});
