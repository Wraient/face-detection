class FaceDetectionSystem {
    constructor() {
        this.video = null;
        this.canvas = null;
        this.overlay = null;
        this.faceCanvas = null;
        this.feedbackCanvas = null;
        this.isModelLoaded = false;
        this.isVideoStarted = false;
        this.currentStream = null;

        // Settings
        this.confidenceThreshold = 0.6;
        this.showExpressions = true;
        this.adaptiveLearning = true;

        // Face database
        this.faceDatabase = this.loadFaceDatabase();

        // Learning system
        this.feedbackDatabase = this.loadFeedbackDatabase();
        this.learningStats = this.loadLearningStats();

        // Current detection data
        this.currentDetection = null;
        this.currentExpression = null;
        this.detectionConfidence = 0;
        this.lastRecognitionResult = null;
        this.pendingFeedback = null;

        // Elements
        this.elements = {};

        // Initialize the system
        this.init();
    } async init() {
        this.initializeElements();
        this.bindEvents();
        await this.loadModels();
        await this.startVideo();
        this.hideLoading();
        this.startDetectionLoop();
    }

    initializeElements() {
        this.elements = {
            video: document.getElementById('video'),
            overlay: document.getElementById('overlay'),
            faceCanvas: document.getElementById('faceCanvas'),
            feedbackCanvas: document.getElementById('feedbackCanvas'),
            statusBox: document.getElementById('statusBox'),
            personName: document.getElementById('personName'),
            expression: document.getElementById('expression'),
            confidence: document.getElementById('confidence'),
            learningScore: document.getElementById('learningScore'),
            feedbackControls: document.getElementById('feedbackControls'),
            settingsModal: document.getElementById('settingsModal'),
            addFaceModal: document.getElementById('addFaceModal'),
            learningStatsModal: document.getElementById('learningStatsModal'),
            feedbackModal: document.getElementById('feedbackModal'),
            loadingOverlay: document.getElementById('loadingOverlay'),
            confidenceSlider: document.getElementById('confidenceSlider'),
            confidenceValue: document.getElementById('confidenceValue'),
            expressionToggle: document.getElementById('expressionToggle'),
            adaptiveLearningToggle: document.getElementById('adaptiveLearning'),
            personNameInput: document.getElementById('personNameInput'),
            correctNameSelect: document.getElementById('correctNameSelect'),
            correctNameInput: document.getElementById('correctNameInput')
        };

        this.video = this.elements.video;
        this.canvas = this.elements.overlay;
        this.overlay = this.canvas.getContext('2d');
        this.faceCanvas = this.elements.faceCanvas;
        this.feedbackCanvas = this.elements.feedbackCanvas;
    }

    bindEvents() {
        // Settings button
        document.getElementById('settingsBtn').addEventListener('click', () => {
            this.showModal('settingsModal');
        });

        // Close settings modal
        document.getElementById('closeSettingsBtn').addEventListener('click', () => {
            this.hideModal('settingsModal');
        });

        // Add face button
        document.getElementById('addFaceBtn').addEventListener('click', () => {
            this.prepareFaceCapture();
        });

        // Close add face modal
        document.getElementById('closeAddFaceBtn').addEventListener('click', () => {
            this.hideModal('addFaceModal');
        });

        // Cancel add face
        document.getElementById('cancelAddFaceBtn').addEventListener('click', () => {
            this.hideModal('addFaceModal');
        });

        // Save face
        document.getElementById('saveFaceBtn').addEventListener('click', () => {
            this.saveFaceToDatabase();
        });

        // Toggle camera
        document.getElementById('toggleCameraBtn').addEventListener('click', () => {
            this.toggleCamera();
        });

        // Learning stats button
        document.getElementById('learningStatsBtn').addEventListener('click', () => {
            this.showLearningStats();
        });

        // Close learning stats modal
        document.getElementById('closeLearningStatsBtn').addEventListener('click', () => {
            this.hideModal('learningStatsModal');
        });

        // Feedback buttons
        document.getElementById('correctBtn').addEventListener('click', () => {
            this.submitFeedback('correct');
        });

        document.getElementById('incorrectBtn').addEventListener('click', () => {
            this.submitFeedback('incorrect');
        });

        // Feedback modal events
        document.getElementById('closeFeedbackBtn').addEventListener('click', () => {
            this.hideModal('feedbackModal');
        });

        document.getElementById('cancelFeedbackBtn').addEventListener('click', () => {
            this.hideModal('feedbackModal');
        });

        document.getElementById('submitFeedbackBtn').addEventListener('click', () => {
            this.submitCorrection();
        });

        // Confidence slider
        this.elements.confidenceSlider.addEventListener('input', (e) => {
            this.confidenceThreshold = parseFloat(e.target.value);
            this.elements.confidenceValue.textContent = e.target.value;
        });

        // Expression toggle
        this.elements.expressionToggle.addEventListener('change', (e) => {
            this.showExpressions = e.target.checked;
        });

        // Adaptive learning toggle
        this.elements.adaptiveLearningToggle.addEventListener('change', (e) => {
            this.adaptiveLearning = e.target.checked;
        });

        // Reset database
        document.getElementById('resetDataBtn').addEventListener('click', () => {
            this.resetDatabase();
        });

        // Reset learning
        document.getElementById('resetLearningBtn').addEventListener('click', () => {
            this.resetLearning();
        });

        // Export data
        document.getElementById('exportDataBtn').addEventListener('click', () => {
            this.exportLearningData();
        });

        // Modal backdrop click
        document.querySelectorAll('.modal').forEach(modal => {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    this.hideModal(modal.id);
                }
            });
        });

        // Enter key for name input
        this.elements.personNameInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.saveFaceToDatabase();
            }
        });

        this.elements.correctNameInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.submitCorrection();
            }
        });
    }

    async loadModels() {
        try {
            const MODEL_URL = 'https://cdn.jsdelivr.net/npm/@vladmandic/face-api@latest/model';

            await faceapi.nets.ssdMobilenetv1.loadFromUri(MODEL_URL);
            await faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL);
            await faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL);
            await faceapi.nets.faceExpressionNet.loadFromUri(MODEL_URL);

            this.isModelLoaded = true;
            console.log('Face detection models loaded successfully');
        } catch (error) {
            console.error('Error loading models:', error);
            this.showError('Failed to load face detection models');
        }
    }

    async startVideo() {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: {
                    width: { ideal: 640 },
                    height: { ideal: 480 },
                    facingMode: 'user'
                }
            });

            this.video.srcObject = stream;
            this.currentStream = stream;
            this.isVideoStarted = true;

            this.video.addEventListener('loadedmetadata', () => {
                this.canvas.width = this.video.videoWidth;
                this.canvas.height = this.video.videoHeight;
            });

            console.log('Camera started successfully');
        } catch (error) {
            console.error('Error accessing camera:', error);
            this.showError('Unable to access camera');
        }
    }

    async toggleCamera() {
        if (this.isVideoStarted) {
            // Stop camera
            if (this.currentStream) {
                this.currentStream.getTracks().forEach(track => track.stop());
                this.currentStream = null;
            }
            this.video.srcObject = null;
            this.isVideoStarted = false;
            this.updateStatus('Camera stopped', 'error');
            document.getElementById('toggleCameraBtn').innerHTML = '<i class="fas fa-video"></i> Start Camera';
        } else {
            // Start camera
            await this.startVideo();
            document.getElementById('toggleCameraBtn').innerHTML = '<i class="fas fa-video-slash"></i> Stop Camera';
            this.updateStatus('Camera started', 'known');
        }
    }

    async startDetectionLoop() {
        const detect = async () => {
            if (this.isModelLoaded && this.isVideoStarted && this.video.readyState === 4) {
                try {
                    const detections = await faceapi
                        .detectAllFaces(this.video, new faceapi.SsdMobilenetv1Options({ minConfidence: 0.5 }))
                        .withFaceLandmarks()
                        .withFaceDescriptors()
                        .withFaceExpressions();

                    this.processDetections(detections);
                } catch (error) {
                    console.error('Detection error:', error);
                }
            }
            requestAnimationFrame(detect);
        };
        detect();
    }

    processDetections(detections) {
        // Clear previous drawings
        this.overlay.clearRect(0, 0, this.canvas.width, this.canvas.height);

        if (detections.length === 0) {
            this.updateStatus('No face detected', 'unknown');
            this.updateInfo('-', '-');
            this.showFeedbackControls(false);
            return;
        }

        // Process the first detected face
        const detection = detections[0];
        this.currentDetection = detection;

        // Draw face rectangle
        this.drawFaceBox(detection);

        // Get expression
        const expressions = detection.expressions;
        const maxExpression = this.getTopExpression(expressions);
        this.currentExpression = maxExpression;

        // Try to recognize the face
        this.recognizeFace(detection);

        // Update info display
        const confidencePercent = Math.round(this.detectionConfidence * 100);
        this.updateInfo(
            this.showExpressions ? maxExpression.expression : '-',
            `${confidencePercent}%`
        );
    } drawFaceBox(detection) {
        const { x, y, width, height } = detection.detection.box;

        // Set drawing style
        this.overlay.strokeStyle = '#00ff00';
        this.overlay.lineWidth = 3;
        this.overlay.fillStyle = 'rgba(0, 255, 0, 0.1)';

        // Draw rectangle
        this.overlay.strokeRect(x, y, width, height);
        this.overlay.fillRect(x, y, width, height);

        // Draw corner markers
        const cornerSize = 20;
        this.overlay.strokeStyle = '#ffffff';
        this.overlay.lineWidth = 4;

        // Top-left corner
        this.overlay.beginPath();
        this.overlay.moveTo(x, y + cornerSize);
        this.overlay.lineTo(x, y);
        this.overlay.lineTo(x + cornerSize, y);
        this.overlay.stroke();

        // Top-right corner
        this.overlay.beginPath();
        this.overlay.moveTo(x + width - cornerSize, y);
        this.overlay.lineTo(x + width, y);
        this.overlay.lineTo(x + width, y + cornerSize);
        this.overlay.stroke();

        // Bottom-left corner
        this.overlay.beginPath();
        this.overlay.moveTo(x, y + height - cornerSize);
        this.overlay.lineTo(x, y + height);
        this.overlay.lineTo(x + cornerSize, y + height);
        this.overlay.stroke();

        // Bottom-right corner
        this.overlay.beginPath();
        this.overlay.moveTo(x + width - cornerSize, y + height);
        this.overlay.lineTo(x + width, y + height);
        this.overlay.lineTo(x + width, y + height - cornerSize);
        this.overlay.stroke();
    }

    getTopExpression(expressions) {
        let maxExpression = { expression: 'neutral', confidence: 0 };

        Object.keys(expressions).forEach(expression => {
            if (expressions[expression] > maxExpression.confidence) {
                maxExpression = {
                    expression: expression,
                    confidence: expressions[expression]
                };
            }
        });

        return maxExpression;
    }

    recognizeFace(detection) {
        if (this.faceDatabase.length === 0) {
            this.updateStatus('Unknown', 'unknown');
            this.detectionConfidence = 0;
            this.showFeedbackControls(false);
            return;
        }

        const faceDescriptor = detection.descriptor;
        let bestMatch = null;
        let bestDistance = Infinity;

        this.faceDatabase.forEach(person => {
            const distance = faceapi.euclideanDistance(faceDescriptor, person.descriptor);
            if (distance < bestDistance) {
                bestDistance = distance;
                bestMatch = person;
            }
        });

        // Convert distance to confidence (lower distance = higher confidence)
        const confidence = Math.max(0, 1 - bestDistance);
        this.detectionConfidence = confidence;

        // Apply adaptive threshold if enabled
        const threshold = this.adaptiveLearning ? this.getAdaptiveThreshold(bestMatch?.name) : this.confidenceThreshold;

        if (confidence >= threshold && bestMatch) {
            this.updateStatus(bestMatch.name, 'known');
            this.lastRecognitionResult = {
                predicted: bestMatch.name,
                confidence: confidence,
                timestamp: Date.now(),
                faceDescriptor: Array.from(faceDescriptor)
            };
            this.showFeedbackControls(true);
        } else {
            this.updateStatus('Unknown', 'unknown');
            this.lastRecognitionResult = {
                predicted: 'Unknown',
                confidence: confidence,
                timestamp: Date.now(),
                faceDescriptor: Array.from(faceDescriptor)
            };
            this.showFeedbackControls(true);
        }
    }

    updateStatus(text, type = 'known') {
        this.elements.personName.textContent = text;
        this.elements.statusBox.className = `status-box ${type}`;
    }

    updateInfo(expression, confidence) {
        this.elements.expression.textContent = expression.charAt(0).toUpperCase() + expression.slice(1);
        this.elements.confidence.textContent = confidence;

        // Update learning score
        const accuracy = this.calculateAccuracy();
        this.elements.learningScore.textContent = accuracy >= 0 ? `${Math.round(accuracy * 100)}%` : '-';
    }

    showFeedbackControls(show) {
        this.elements.feedbackControls.style.display = show ? 'flex' : 'none';
    }

    // Learning System Methods
    submitFeedback(feedbackType) {
        if (!this.lastRecognitionResult) return;

        if (feedbackType === 'correct') {
            this.recordFeedback('correct', this.lastRecognitionResult.predicted, this.lastRecognitionResult.predicted);
            this.showTemporaryStatus('✓ Thanks for the feedback!', 'known');
        } else {
            // Show correction modal
            this.prepareFeedbackCorrection();
        }

        this.showFeedbackControls(false);
    }

    prepareFeedbackCorrection() {
        if (!this.lastRecognitionResult) return;

        // Extract face for correction modal
        this.extractFeedbackFace();

        // Populate name options
        this.populateNameOptions();

        this.showModal('feedbackModal');
    }

    extractFeedbackFace() {
        if (!this.currentDetection) return;

        const { x, y, width, height } = this.currentDetection.detection.box;

        const tempCanvas = document.createElement('canvas');
        const tempCtx = tempCanvas.getContext('2d');

        const padding = 20;
        const faceWidth = width + (padding * 2);
        const faceHeight = height + (padding * 2);

        tempCanvas.width = faceWidth;
        tempCanvas.height = faceHeight;

        tempCtx.drawImage(
            this.video,
            Math.max(0, x - padding),
            Math.max(0, y - padding),
            Math.min(this.video.videoWidth - x + padding, faceWidth),
            Math.min(this.video.videoHeight - y + padding, faceHeight),
            0,
            0,
            faceWidth,
            faceHeight
        );

        this.feedbackCanvas.width = 150;
        this.feedbackCanvas.height = 150;
        const feedbackCtx = this.feedbackCanvas.getContext('2d');
        feedbackCtx.drawImage(tempCanvas, 0, 0, 150, 150);
    }

    populateNameOptions() {
        const select = this.elements.correctNameSelect;
        select.innerHTML = '<option value="">Select correct person...</option>';

        this.faceDatabase.forEach(person => {
            const option = document.createElement('option');
            option.value = person.name;
            option.textContent = person.name;
            select.appendChild(option);
        });
    }

    submitCorrection() {
        const selectedName = this.elements.correctNameSelect.value;
        const inputName = this.elements.correctNameInput.value.trim();
        const correctName = selectedName || inputName;

        if (!correctName) {
            alert('Please select or enter the correct name.');
            return;
        }

        if (!this.lastRecognitionResult) {
            alert('No recognition data available.');
            return;
        }

        // Record the correction
        this.recordFeedback('incorrect', this.lastRecognitionResult.predicted, correctName);

        // If it's a new name, add to database
        if (inputName && !this.faceDatabase.find(p => p.name.toLowerCase() === inputName.toLowerCase())) {
            const newPerson = {
                id: Date.now().toString(),
                name: inputName,
                descriptor: new Float32Array(this.lastRecognitionResult.faceDescriptor),
                dateAdded: new Date().toISOString()
            };
            this.faceDatabase.push(newPerson);
            this.saveFaceDatabase();
        }

        this.hideModal('feedbackModal');
        this.showTemporaryStatus(`✓ Corrected to: ${correctName}`, 'known');

        // Clear inputs
        this.elements.correctNameSelect.value = '';
        this.elements.correctNameInput.value = '';
    }

    recordFeedback(type, predicted, actual) {
        const feedback = {
            id: Date.now().toString(),
            type: type,
            predicted: predicted,
            actual: actual,
            confidence: this.lastRecognitionResult?.confidence || 0,
            timestamp: Date.now(),
            dateTime: new Date().toLocaleString()
        };

        this.feedbackDatabase.push(feedback);
        this.updateLearningStats(feedback);
        this.saveFeedbackDatabase();

        // Apply adaptive learning
        if (this.adaptiveLearning) {
            this.updateAdaptiveThresholds(feedback);
        }
    }

    updateLearningStats(feedback) {
        this.learningStats.totalFeedback++;

        if (feedback.type === 'correct') {
            this.learningStats.correctPredictions++;
        }

        this.learningStats.accuracy = this.learningStats.correctPredictions / this.learningStats.totalFeedback;
        this.learningStats.lastUpdated = Date.now();

        this.saveLearningStats();
    }

    getAdaptiveThreshold(personName) {
        if (!personName || !this.learningStats.adaptiveThresholds[personName]) {
            return this.confidenceThreshold;
        }
        return this.learningStats.adaptiveThresholds[personName];
    }

    updateAdaptiveThresholds(feedback) {
        const personName = feedback.actual;

        if (!this.learningStats.adaptiveThresholds[personName]) {
            this.learningStats.adaptiveThresholds[personName] = this.confidenceThreshold;
        }

        const currentThreshold = this.learningStats.adaptiveThresholds[personName];

        if (feedback.type === 'correct' && feedback.predicted === personName) {
            // Lower threshold slightly for correct positive predictions
            this.learningStats.adaptiveThresholds[personName] = Math.max(0.3, currentThreshold - 0.02);
        } else if (feedback.type === 'incorrect') {
            if (feedback.predicted === personName) {
                // Raise threshold for false positives
                this.learningStats.adaptiveThresholds[personName] = Math.min(0.9, currentThreshold + 0.05);
            } else if (feedback.predicted === 'Unknown') {
                // Lower threshold for false negatives
                this.learningStats.adaptiveThresholds[personName] = Math.max(0.3, currentThreshold - 0.03);
            }
        }
    }

    calculateAccuracy() {
        if (this.learningStats.totalFeedback === 0) return -1;
        return this.learningStats.accuracy;
    }

    showLearningStats() {
        this.updateStatsDisplay();
        this.drawLearningChart();
        this.populateFeedbackHistory();
        this.showModal('learningStatsModal');
    }

    updateStatsDisplay() {
        document.getElementById('totalFeedback').textContent = this.learningStats.totalFeedback;
        document.getElementById('correctPredictions').textContent = this.learningStats.correctPredictions;

        const accuracy = this.calculateAccuracy();
        document.getElementById('accuracyRate').textContent = accuracy >= 0 ? `${Math.round(accuracy * 100)}%` : '-';
        document.getElementById('currentThreshold').textContent = this.confidenceThreshold.toFixed(2);
    }

    drawLearningChart() {
        const canvas = document.getElementById('learningChart');
        const ctx = canvas.getContext('2d');

        // Clear canvas
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        if (this.feedbackDatabase.length < 2) {
            ctx.fillStyle = '#666';
            ctx.font = '14px Inter';
            ctx.textAlign = 'center';
            ctx.fillText('Not enough data to display chart', canvas.width / 2, canvas.height / 2);
            return;
        }

        // Calculate accuracy over time
        const dataPoints = [];
        let correct = 0;

        this.feedbackDatabase.forEach((feedback, index) => {
            if (feedback.type === 'correct') correct++;
            const accuracy = correct / (index + 1);
            dataPoints.push(accuracy);
        });

        // Draw chart
        const padding = 40;
        const chartWidth = canvas.width - (padding * 2);
        const chartHeight = canvas.height - (padding * 2);

        // Draw axes
        ctx.strokeStyle = '#ddd';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(padding, padding);
        ctx.lineTo(padding, canvas.height - padding);
        ctx.lineTo(canvas.width - padding, canvas.height - padding);
        ctx.stroke();

        // Draw data line
        if (dataPoints.length > 1) {
            ctx.strokeStyle = '#007bff';
            ctx.lineWidth = 2;
            ctx.beginPath();

            dataPoints.forEach((point, index) => {
                const x = padding + (index / (dataPoints.length - 1)) * chartWidth;
                const y = (canvas.height - padding) - (point * chartHeight);

                if (index === 0) {
                    ctx.moveTo(x, y);
                } else {
                    ctx.lineTo(x, y);
                }
            });

            ctx.stroke();
        }

        // Add labels
        ctx.fillStyle = '#666';
        ctx.font = '12px Inter';
        ctx.textAlign = 'center';
        ctx.fillText('Learning Progress Over Time', canvas.width / 2, 20);
        ctx.fillText('0%', padding, canvas.height - 10);
        ctx.fillText('100%', padding, 25);
    }

    populateFeedbackHistory() {
        const feedbackList = document.getElementById('feedbackList');
        feedbackList.innerHTML = '';

        const recentFeedback = this.feedbackDatabase.slice(-10).reverse();

        if (recentFeedback.length === 0) {
            feedbackList.innerHTML = '<p style="text-align: center; color: #666;">No feedback recorded yet.</p>';
            return;
        }

        recentFeedback.forEach(feedback => {
            const item = document.createElement('div');
            item.className = `feedback-item ${feedback.type}`;

            const isCorrect = feedback.type === 'correct';
            const text = isCorrect
                ? `Correctly identified as ${feedback.predicted}`
                : `Corrected from "${feedback.predicted}" to "${feedback.actual}"`;

            item.innerHTML = `
                <div class="feedback-details">
                    <div class="feedback-text">${text}</div>
                    <div class="feedback-time">${feedback.dateTime}</div>
                </div>
                <div class="feedback-icon ${feedback.type}">
                    <i class="fas fa-thumbs-${isCorrect ? 'up' : 'down'}"></i>
                </div>
            `;

            feedbackList.appendChild(item);
        });
    }

    showTemporaryStatus(message, type) {
        const originalText = this.elements.personName.textContent;
        const originalType = this.elements.statusBox.className;

        this.updateStatus(message, type);

        setTimeout(() => {
            this.elements.personName.textContent = originalText;
            this.elements.statusBox.className = originalType;
        }, 3000);
    }

    resetLearning() {
        if (confirm('Are you sure you want to reset all learning data? This will clear feedback history and adaptive thresholds.')) {
            this.feedbackDatabase = [];
            this.learningStats = {
                totalFeedback: 0,
                correctPredictions: 0,
                accuracy: 0,
                adaptiveThresholds: {},
                lastUpdated: Date.now()
            };

            this.saveFeedbackDatabase();
            this.saveLearningStats();

            this.hideModal('learningStatsModal');
            this.showTemporaryStatus('Learning data reset', 'error');
        }
    }

    exportLearningData() {
        const data = {
            feedbackDatabase: this.feedbackDatabase,
            learningStats: this.learningStats,
            faceDatabase: this.faceDatabase.map(person => ({
                ...person,
                descriptor: Array.from(person.descriptor)
            })),
            exportDate: new Date().toISOString()
        };

        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);

        const a = document.createElement('a');
        a.href = url;
        a.download = `face-detection-data-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);

        URL.revokeObjectURL(url);
    }

    // Storage methods for learning system
    loadFeedbackDatabase() {
        try {
            const data = localStorage.getItem('faceDetectionFeedback');
            return data ? JSON.parse(data) : [];
        } catch (error) {
            console.error('Error loading feedback database:', error);
            return [];
        }
    }

    saveFeedbackDatabase() {
        try {
            localStorage.setItem('faceDetectionFeedback', JSON.stringify(this.feedbackDatabase));
        } catch (error) {
            console.error('Error saving feedback database:', error);
        }
    }

    loadLearningStats() {
        try {
            const data = localStorage.getItem('faceDetectionLearningStats');
            return data ? JSON.parse(data) : {
                totalFeedback: 0,
                correctPredictions: 0,
                accuracy: 0,
                adaptiveThresholds: {},
                lastUpdated: Date.now()
            };
        } catch (error) {
            console.error('Error loading learning stats:', error);
            return {
                totalFeedback: 0,
                correctPredictions: 0,
                accuracy: 0,
                adaptiveThresholds: {},
                lastUpdated: Date.now()
            };
        }
    }

    saveLearningStats() {
        try {
            localStorage.setItem('faceDetectionLearningStats', JSON.stringify(this.learningStats));
        } catch (error) {
            console.error('Error saving learning stats:', error);
        }
    }

    prepareFaceCapture() {
        if (!this.currentDetection) {
            alert('No face detected. Please ensure a face is visible in the camera.');
            return;
        }

        // Extract face from current frame
        this.extractFace();
        this.elements.personNameInput.value = '';
        this.showModal('addFaceModal');
    }

    extractFace() {
        const { x, y, width, height } = this.currentDetection.detection.box;

        // Create a temporary canvas to extract the face
        const tempCanvas = document.createElement('canvas');
        const tempCtx = tempCanvas.getContext('2d');

        // Add some padding around the face
        const padding = 20;
        const faceWidth = width + (padding * 2);
        const faceHeight = height + (padding * 2);

        tempCanvas.width = faceWidth;
        tempCanvas.height = faceHeight;

        // Draw the face region
        tempCtx.drawImage(
            this.video,
            Math.max(0, x - padding),
            Math.max(0, y - padding),
            Math.min(this.video.videoWidth - x + padding, faceWidth),
            Math.min(this.video.videoHeight - y + padding, faceHeight),
            0,
            0,
            faceWidth,
            faceHeight
        );

        // Display in face canvas
        this.faceCanvas.width = 200;
        this.faceCanvas.height = 200;
        const faceCtx = this.faceCanvas.getContext('2d');
        faceCtx.drawImage(tempCanvas, 0, 0, 200, 200);
    }

    saveFaceToDatabase() {
        const name = this.elements.personNameInput.value.trim();

        if (!name) {
            alert('Please enter a name for this person.');
            return;
        }

        if (!this.currentDetection) {
            alert('No face data available. Please try again.');
            return;
        }

        // Check if name already exists
        const existingPerson = this.faceDatabase.find(person =>
            person.name.toLowerCase() === name.toLowerCase()
        );

        if (existingPerson) {
            if (!confirm(`A person named "${name}" already exists. Do you want to update their data?`)) {
                return;
            }
            // Remove existing entry
            this.faceDatabase = this.faceDatabase.filter(person =>
                person.name.toLowerCase() !== name.toLowerCase()
            );
        }

        // Add new face to database
        const newPerson = {
            id: Date.now().toString(),
            name: name,
            descriptor: Array.from(this.currentDetection.descriptor),
            dateAdded: new Date().toISOString()
        };

        this.faceDatabase.push(newPerson);
        this.saveFaceDatabase();

        this.hideModal('addFaceModal');
        this.updateStatus(`Added ${name} to database`, 'known');

        setTimeout(() => {
            this.updateStatus('Ready', 'known');
        }, 2000);
    }

    loadFaceDatabase() {
        try {
            const data = localStorage.getItem('faceDetectionDB');
            if (data) {
                const parsed = JSON.parse(data);
                // Convert descriptor arrays back to Float32Array
                return parsed.map(person => ({
                    ...person,
                    descriptor: new Float32Array(person.descriptor)
                }));
            }
        } catch (error) {
            console.error('Error loading face database:', error);
        }
        return [];
    }

    saveFaceDatabase() {
        try {
            // Convert Float32Array to regular array for JSON storage
            const dataToSave = this.faceDatabase.map(person => ({
                ...person,
                descriptor: Array.from(person.descriptor)
            }));
            localStorage.setItem('faceDetectionDB', JSON.stringify(dataToSave));
        } catch (error) {
            console.error('Error saving face database:', error);
        }
    }

    resetDatabase() {
        if (confirm('Are you sure you want to clear all face data AND learning data? This cannot be undone.')) {
            this.faceDatabase = [];
            this.feedbackDatabase = [];
            this.learningStats = {
                totalFeedback: 0,
                correctPredictions: 0,
                accuracy: 0,
                adaptiveThresholds: {},
                lastUpdated: Date.now()
            };

            this.saveFaceDatabase();
            this.saveFeedbackDatabase();
            this.saveLearningStats();

            this.hideModal('settingsModal');
            this.showTemporaryStatus('All data cleared', 'error');
        }
    } showModal(modalId) {
        document.getElementById(modalId).classList.add('active');
    }

    hideModal(modalId) {
        document.getElementById(modalId).classList.remove('active');
    }

    showError(message) {
        this.updateStatus(message, 'error');
        console.error(message);
    }

    hideLoading() {
        this.elements.loadingOverlay.classList.add('hidden');
        setTimeout(() => {
            this.elements.loadingOverlay.style.display = 'none';
        }, 500);
    }
}

// Initialize the system when the page loads
document.addEventListener('DOMContentLoaded', () => {
    // Check if browser supports required APIs
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        alert('Your browser does not support camera access. Please use a modern browser.');
        return;
    }

    // Initialize the face detection system
    window.faceDetectionSystem = new FaceDetectionSystem();
});

// Handle page unload
window.addEventListener('beforeunload', () => {
    if (window.faceDetectionSystem && window.faceDetectionSystem.currentStream) {
        window.faceDetectionSystem.currentStream.getTracks().forEach(track => track.stop());
    }
});
