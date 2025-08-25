class FaceDetectionSystem {
    constructor() {
        this.video = null;
        this.canvas = null;
        this.overlay = null;
        this.faceCanvas = null;
        this.isModelLoaded = false;
        this.isVideoStarted = false;
        this.currentStream = null;

        // Settings
        this.confidenceThreshold = 0.6;
        this.showExpressions = true;

        // Face database
        this.faceDatabase = this.loadFaceDatabase();

        // Current detection data
        this.currentDetection = null;
        this.currentExpression = null;
        this.detectionConfidence = 0;

        // Elements
        this.elements = {};

        // Initialize the system
        this.init();
    }

    async init() {
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
            statusBox: document.getElementById('statusBox'),
            personName: document.getElementById('personName'),
            expression: document.getElementById('expression'),
            confidence: document.getElementById('confidence'),
            settingsModal: document.getElementById('settingsModal'),
            addFaceModal: document.getElementById('addFaceModal'),
            loadingOverlay: document.getElementById('loadingOverlay'),
            confidenceSlider: document.getElementById('confidenceSlider'),
            confidenceValue: document.getElementById('confidenceValue'),
            expressionToggle: document.getElementById('expressionToggle'),
            personNameInput: document.getElementById('personNameInput')
        };

        this.video = this.elements.video;
        this.canvas = this.elements.overlay;
        this.overlay = this.canvas.getContext('2d');
        this.faceCanvas = this.elements.faceCanvas;
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

        // Confidence slider
        this.elements.confidenceSlider.addEventListener('input', (e) => {
            this.confidenceThreshold = parseFloat(e.target.value);
            this.elements.confidenceValue.textContent = e.target.value;
        });

        // Expression toggle
        this.elements.expressionToggle.addEventListener('change', (e) => {
            this.showExpressions = e.target.checked;
        });

        // Reset database
        document.getElementById('resetDataBtn').addEventListener('click', () => {
            this.resetDatabase();
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
    }

    drawFaceBox(detection) {
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

        if (confidence >= this.confidenceThreshold && bestMatch) {
            this.updateStatus(bestMatch.name, 'known');
        } else {
            this.updateStatus('Unknown', 'unknown');
        }
    }

    updateStatus(text, type = 'known') {
        this.elements.personName.textContent = text;
        this.elements.statusBox.className = `status-box ${type}`;
    }

    updateInfo(expression, confidence) {
        this.elements.expression.textContent = expression.charAt(0).toUpperCase() + expression.slice(1);
        this.elements.confidence.textContent = confidence;
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
        if (confirm('Are you sure you want to clear all face data? This cannot be undone.')) {
            this.faceDatabase = [];
            this.saveFaceDatabase();
            this.hideModal('settingsModal');
            this.updateStatus('Database cleared', 'error');

            setTimeout(() => {
                this.updateStatus('Ready', 'known');
            }, 2000);
        }
    }

    showModal(modalId) {
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
