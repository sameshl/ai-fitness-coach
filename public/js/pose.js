import { EXERCISE_CONFIG } from './config.js';

export class PoseDetector {
  constructor() {
    this.detector = null;
    this.video = null;
    this.canvas = null;
    this.ctx = null;
    this.isInitialized = false;
  }

  async initialize(videoElement, canvasElement) {
    this.video = videoElement;
    this.canvas = canvasElement;
    this.ctx = this.canvas.getContext('2d');

    try {
      this.detector = await poseDetection.createDetector(
        poseDetection.SupportedModels.MoveNet
      );
      this.isInitialized = true;
      
      // Set up canvas resize handler
      const resizeCanvas = () => {
        this.canvas.width = this.video.clientWidth;
        this.canvas.height = this.video.clientHeight;
      };
      resizeCanvas();
      window.addEventListener('resize', resizeCanvas);
    } catch (error) {
      console.error('Pose detection setup error:', error);
      throw error;
    }
  }

  async detectPose() {
    if (!this.isInitialized) return null;

    const poses = await this.detector.estimatePoses(this.video);
    this.drawPose(poses);
    return poses;
  }

  drawPose(poses) {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    poses.forEach(pose => {
      // Draw keypoints
      pose.keypoints.forEach(keypoint => {
        if (keypoint.score > 0.5) {
          this.ctx.beginPath();
          this.ctx.arc(
            (keypoint.x * this.canvas.width) / this.video.videoWidth,
            (keypoint.y * this.canvas.height) / this.video.videoHeight,
            5, 0, 2 * Math.PI
          );
          this.ctx.fillStyle = 'red';
          this.ctx.fill();
        }
      });

      // Draw skeleton
      this.drawSkeleton(pose);
    });
  }

  drawSkeleton(pose) {
    const connections = [
      ['left_shoulder', 'right_shoulder'],
      ['left_hip', 'right_hip'],
      ['left_shoulder', 'left_hip'],
      ['right_shoulder', 'right_hip'],
      ['left_shoulder', 'left_elbow'],
      ['right_shoulder', 'right_elbow'],
      ['left_elbow', 'left_wrist'],
      ['right_elbow', 'right_wrist'],
      ['left_hip', 'left_knee'],
      ['right_hip', 'right_knee'],
      ['left_knee', 'left_ankle'],
      ['right_knee', 'right_ankle'],
    ];

    this.ctx.strokeStyle = 'blue';
    this.ctx.lineWidth = 2;

    connections.forEach(([from, to]) => {
      const fromPoint = pose.keypoints.find(kp => kp.name === from);
      const toPoint = pose.keypoints.find(kp => kp.name === to);

      if (fromPoint && toPoint && fromPoint.score > 0.5 && toPoint.score > 0.5) {
        this.ctx.beginPath();
        this.ctx.moveTo(
          (fromPoint.x * this.canvas.width) / this.video.videoWidth,
          (fromPoint.y * this.canvas.height) / this.video.videoHeight
        );
        this.ctx.lineTo(
          (toPoint.x * this.canvas.width) / this.video.videoWidth,
          (toPoint.y * this.canvas.height) / this.video.videoHeight
        );
        this.ctx.stroke();
      }
    });
  }
} 