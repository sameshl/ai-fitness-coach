export class RecordingManager {
  constructor() {
    this.isRecording = false;
    this.recordedPoses = [];
    this.lastRecordedTime = 0;
    this.exerciseBuffer = [];
    this.lastRepTime = 0;
    this.recordingStartTimeout = null;
    this.lastExerciseType = '';
  }

  startRecording() {
    this.isRecording = true;
    this.recordedPoses = [];
    this.lastRecordedTime = Date.now();
  }

  stopRecording() {
    this.isRecording = false;
    if (this.recordingStartTimeout) {
      clearTimeout(this.recordingStartTimeout);
      this.recordingStartTimeout = null;
    }
  }

  recordPose(pose, analysis) {
    if (!this.isRecording) return;

    const currentTime = Date.now();
    if (currentTime - this.lastRecordedTime >= 100) { // 10fps
      this.recordedPoses.push({
        timestamp: currentTime,
        pose,
        analysis
      });
      this.lastRecordedTime = currentTime;
    }
  }

  downloadRecording() {
    const dataStr = JSON.stringify(this.recordedPoses, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `pose_analysis_${new Date().toISOString()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
} 