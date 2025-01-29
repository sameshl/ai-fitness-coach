import { PoseDetector } from './pose.js';
import { StreamingService } from './streaming.js';
import { RecordingManager } from './recording.js';
import { checkCameraPermissions, updateStatus } from './utils.js';

class App {
  constructor() {
    this.initializeElements();
    this.setupEventListeners();
    this.poseDetector = new PoseDetector();
    this.streamingService = new StreamingService(this.updateStatus.bind(this));
    this.recordingManager = new RecordingManager();
  }

  initializeElements() {
    this.elements = {
      startBtn: document.getElementById('startBtn'),
      closeBtn: document.getElementById('closeBtn'),
      cameraPermissionBtn: document.getElementById('cameraPermissionBtn'),
      exerciseSelect: document.getElementById('exerciseSelect'),
      mediaElement: document.getElementById('mediaElement'),
      poseVideo: document.getElementById('poseVideo'),
      poseCanvas: document.getElementById('poseCanvas'),
      status: document.getElementById('status'),
      recordButton: document.getElementById('recordButton'),
      downloadButton: document.getElementById('downloadButton'),
    };
  }

  setupEventListeners() {
    this.elements.startBtn.addEventListener('click', this.handleStart.bind(this));
    this.elements.closeBtn.addEventListener('click', this.handleClose.bind(this));
    this.elements.cameraPermissionBtn.addEventListener('click', this.requestCameraPermission.bind(this));
    this.elements.exerciseSelect.addEventListener('change', this.handleExerciseChange.bind(this));
    this.elements.recordButton.addEventListener('click', this.handleRecording.bind(this));
    this.elements.downloadButton.addEventListener('click', () => this.recordingManager.downloadRecording());
  }

  async handleStart() {
    try {
      if (!this.cameraStream) {
        this.updateStatus('Please enable camera access first');
        return;
      }
      await this.streamingService.createNewSession();
      await this.streamingService.startSession();
      this.elements.startBtn.disabled = true;
      this.showRecordingButtons();
    } catch (error) {
      this.updateStatus(`Failed to start session: ${error.message}`);
      console.error('Start session error:', error);
    }
  }

  async handleClose() {
    await this.streamingService.closeSession();
    this.elements.startBtn.disabled = false;
    this.hideRecordingButtons();
  }

  async requestCameraPermission() {
    try {
      this.cameraStream = await checkCameraPermissions();
      if (this.cameraStream) {
        this.elements.cameraPermissionBtn.style.display = 'none';
        this.elements.startBtn.disabled = false;
        this.elements.poseVideo.srcObject = this.cameraStream;
        await this.poseDetector.initialize(this.elements.poseVideo, this.elements.poseCanvas);
        this.updateStatus('Camera permission granted');
        this.startPoseDetection();
      }
    } catch (error) {
      this.updateStatus(`Failed to get camera permission: ${error.message}`);
    }
  }

  async handleExerciseChange(e) {
    const currentExercise = e.target.value;
    if (currentExercise === this.recordingManager.lastExerciseType) return;

    if (currentExercise === 'calorieTracking') {
      await this.captureAndAnalyzeImage();
    } else if (currentExercise === 'daveSings') {
      const lyrics = `Runnin' up the code, like Marathon,
Peak XV, we the ones they call on,
VC kings, bringin' tech to Babylon,
Ideas spark hotter than a laser dawn.`;
      await this.streamingService.sendText(lyrics, 'repeat');
    }

    this.recordingManager.lastExerciseType = currentExercise;
  }

  handleRecording() {
    const recordButton = this.elements.recordButton;
    const downloadButton = this.elements.downloadButton;

    if (!this.recordingManager.isRecording) {
      recordButton.textContent = 'Stop Recording';
      recordButton.classList.replace('bg-purple-500', 'bg-red-500');
      recordButton.classList.replace('hover:bg-purple-600', 'hover:bg-red-600');
      downloadButton.disabled = true;

      this.recordingManager.recordingStartTimeout = setTimeout(() => {
        this.recordingManager.startRecording();
      }, 2000);
    } else {
      this.recordingManager.stopRecording();
      recordButton.textContent = 'Start Recording';
      recordButton.classList.replace('bg-red-500', 'bg-purple-500');
      recordButton.classList.replace('hover:bg-red-600', 'hover:bg-purple-600');
      downloadButton.disabled = false;
    }
  }

  showRecordingButtons() {
    this.elements.recordButton.classList.remove('hidden');
    this.elements.downloadButton.classList.remove('hidden');
  }

  hideRecordingButtons() {
    this.elements.recordButton.classList.add('hidden');
    this.elements.downloadButton.classList.add('hidden');
  }

  async captureAndAnalyzeImage() {
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = this.elements.poseVideo.videoWidth;
    tempCanvas.height = this.elements.poseVideo.videoHeight;
    const ctx = tempCanvas.getContext('2d');
    ctx.drawImage(this.elements.poseVideo, 0, 0);
    
    const base64Image = tempCanvas.toDataURL('image/jpeg', 0.8).split(',')[1];

    try {
      const response = await fetch(`${API_CONFIG.localApiUrl}/vision`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt: 'What food items are visible in this image? Please provide a brief description with estimated calories.',
          image: base64Image,
        }),
      });

      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      const data = await response.json();

      if (data.choices && data.choices[0].message.content) {
        const responseText = data.choices[0].message.content + ' (Meal logged)';
        await this.streamingService.sendText(responseText, 'repeat');
      }
    } catch (error) {
      this.updateStatus(`Vision API error: ${error.message}`);
    }
  }

  startPoseDetection() {
    const detectFrame = async () => {
      if (!this.poseDetector) return;

      const poses = await this.poseDetector.detectPose();
      if (poses && poses.length > 0) {
        const analysis = await this.analyzePose(poses);
        if (this.recordingManager.isRecording) {
          this.recordingManager.recordPose(poses[0], analysis);
        }
      }
      requestAnimationFrame(detectFrame);
    };

    detectFrame();
  }

  async analyzePose(poses) {
    if (!poses.length) return null;

    const pose = poses[0];
    const keypoints = Object.fromEntries(
      pose.keypoints.filter(k => k.score > 0.5).map(k => [k.name, k])
    );

    const exerciseType = this.elements.exerciseSelect.value;
    const analysis = { timestamp: Date.now() };

    if (exerciseType === 'pushups') {
      analysis.pushups = this.analyzePushup(keypoints);
    } else if (exerciseType === 'bicepCurls') {
      analysis.bicepCurls = this.analyzeBicepCurl(keypoints);
    }

    return analysis;
  }

  analyzePushup(keypoints) {
    const analysis = {};

    // Calculate midpoints
    const shoulderMidpoint = this.getMidpoint(keypoints.left_shoulder, keypoints.right_shoulder);
    const hipMidpoint = this.getMidpoint(keypoints.left_hip, keypoints.right_hip);
    const ankleMidpoint = this.getMidpoint(keypoints.left_ankle, keypoints.right_ankle);

    if (shoulderMidpoint && hipMidpoint && ankleMidpoint) {
      analysis.plankAlignment = getAngleBetweenPoints(shoulderMidpoint, hipMidpoint, ankleMidpoint);
    }

    if (keypoints.left_shoulder && keypoints.right_shoulder) {
      analysis.height = Math.min(keypoints.left_shoulder.y, keypoints.right_shoulder.y);
    }

    return analysis;
  }

  analyzeBicepCurl(keypoints) {
    const analysis = {};

    if (keypoints.left_shoulder && keypoints.left_elbow && keypoints.left_wrist) {
      analysis.leftArmAngle = getAngleBetweenPoints(
        keypoints.left_shoulder,
        keypoints.left_elbow,
        keypoints.left_wrist
      );
    }

    if (keypoints.right_shoulder && keypoints.right_elbow && keypoints.right_wrist) {
      analysis.rightArmAngle = getAngleBetweenPoints(
        keypoints.right_shoulder,
        keypoints.right_elbow,
        keypoints.right_wrist
      );
    }

    const shoulderWidth = keypoints.left_shoulder && keypoints.right_shoulder
      ? Math.abs(keypoints.right_shoulder.x - keypoints.left_shoulder.x)
      : 0;

    if (shoulderWidth > 0) {
      if (keypoints.left_shoulder && keypoints.left_elbow) {
        const leftTuck = Math.abs(keypoints.left_elbow.x - keypoints.left_shoulder.x);
        analysis.leftTuck = Math.min((leftTuck / shoulderWidth) * 100, 100);
      }

      if (keypoints.right_shoulder && keypoints.right_elbow) {
        const rightTuck = Math.abs(keypoints.right_elbow.x - keypoints.right_shoulder.x);
        analysis.rightTuck = Math.min((rightTuck / shoulderWidth) * 100, 100);
      }
    }

    return analysis;
  }

  getMidpoint(point1, point2) {
    if (!point1 || !point2) return null;
    return {
      x: (point1.x + point2.x) / 2,
      y: (point1.y + point2.y) / 2,
    };
  }

  updateStatus(message) {
    updateStatus(message, this.elements.status);
  }
}

// Initialize the app
const app = new App(); 