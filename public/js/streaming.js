import { API_CONFIG } from './config.js';

export class StreamingService {
  constructor(statusCallback) {
    this.sessionInfo = null;
    this.room = null;
    this.mediaStream = null;
    this.webSocket = null;
    this.sessionToken = null;
    this.updateStatus = statusCallback;
  }

  async getSessionToken() {
    const response = await fetch(`${API_CONFIG.serverUrl}/v1/streaming.create_token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Api-Key': API_CONFIG.apiKey,
      },
    });

    const data = await response.json();
    this.sessionToken = data.data.token;
    this.updateStatus('Session token obtained');
  }

  async createNewSession() {
    if (!this.sessionToken) {
      await this.getSessionToken();
    }

    const response = await fetch(`${API_CONFIG.serverUrl}/v1/streaming.new`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.sessionToken}`,
      },
      body: JSON.stringify({
        quality: 'high',
        avatar_name: 'Bryan_FitnessCoach_public',
        version: 'v2',
        video_encoding: 'H264',
      }),
    });

    const data = await response.json();
    this.sessionInfo = data.data;
    await this.setupRoom();
  }

  async setupRoom() {
    this.room = new LivekitClient.Room({
      adaptiveStream: true,
      dynacast: true,
      videoCaptureDefaults: {
        resolution: LivekitClient.VideoPresets.h720.resolution,
      },
    });

    this.setupRoomEventHandlers();
    await this.room.prepareConnection(this.sessionInfo.url, this.sessionInfo.access_token);
    this.updateStatus('Connection prepared');
    await this.connectWebSocket();
  }

  setupRoomEventHandlers() {
    this.room.on(LivekitClient.RoomEvent.DataReceived, (message) => {
      const data = new TextDecoder().decode(message);
      console.log('Room message:', JSON.parse(data));
    });

    this.mediaStream = new MediaStream();
    this.room.on(LivekitClient.RoomEvent.TrackSubscribed, this.handleTrackSubscribed.bind(this));
    this.room.on(LivekitClient.RoomEvent.TrackUnsubscribed, this.handleTrackUnsubscribed.bind(this));
    this.room.on(LivekitClient.RoomEvent.Disconnected, this.handleDisconnect.bind(this));
  }

  async connectWebSocket() {
    const params = new URLSearchParams({
      session_id: this.sessionInfo.session_id,
      session_token: this.sessionToken,
      silence_response: false,
      opening_text: "Hello, I'm your AI fitness coach!",
      stt_language: "en",
    });

    const wsUrl = `wss://${new URL(API_CONFIG.serverUrl).hostname}/v1/ws/streaming.chat?${params}`;
    this.webSocket = new WebSocket(wsUrl);

    this.webSocket.addEventListener("message", (event) => {
      const eventData = JSON.parse(event.data);
      console.log("WebSocket message:", eventData);
    });
  }

  handleTrackSubscribed(track) {
    if (track.kind === "video" || track.kind === "audio") {
      this.mediaStream.addTrack(track.mediaStreamTrack);
      if (this.mediaStream.getVideoTracks().length > 0 && this.mediaStream.getAudioTracks().length > 0) {
        this.updateStatus('Media stream ready');
      }
    }
  }

  handleTrackUnsubscribed(track) {
    const mediaTrack = track.mediaStreamTrack;
    if (mediaTrack) {
      this.mediaStream.removeTrack(mediaTrack);
    }
  }

  handleDisconnect(reason) {
    this.updateStatus(`Room disconnected: ${reason}`);
  }

  async startSession() {
    try {
      const startResponse = await fetch(`${API_CONFIG.serverUrl}/v1/streaming.start`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.sessionToken}`,
        },
        body: JSON.stringify({
          session_id: this.sessionInfo.session_id,
        }),
      });

      await this.room.connect(this.sessionInfo.url, this.sessionInfo.access_token);
      this.updateStatus('Connected to room');
      return true;
    } catch (error) {
      this.updateStatus(`Error starting session: ${error.message}`);
      console.error('Session start error:', error);
      return false;
    }
  }

  async sendText(text, taskType = 'talk') {
    if (!this.sessionInfo) {
      this.updateStatus('No active session');
      return;
    }

    try {
      await fetch(`${API_CONFIG.serverUrl}/v1/streaming.task`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.sessionToken}`,
        },
        body: JSON.stringify({
          session_id: this.sessionInfo.session_id,
          text: text,
          task_type: taskType,
        }),
      });
      this.updateStatus(`Sent text (${taskType}): ${text}`);
    } catch (error) {
      this.updateStatus(`Error sending text: ${error.message}`);
    }
  }

  async closeSession() {
    if (!this.sessionInfo) {
      this.updateStatus('No active session');
      return;
    }

    try {
      await fetch(`${API_CONFIG.serverUrl}/v1/streaming.stop`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.sessionToken}`,
        },
        body: JSON.stringify({
          session_id: this.sessionInfo.session_id,
        }),
      });

      if (this.webSocket) {
        this.webSocket.close();
      }
      if (this.room) {
        this.room.disconnect();
      }

      this.sessionInfo = null;
      this.room = null;
      this.mediaStream = null;
      this.sessionToken = null;
      this.updateStatus('Session closed');
    } catch (error) {
      this.updateStatus(`Error closing session: ${error.message}`);
    }
  }
} 