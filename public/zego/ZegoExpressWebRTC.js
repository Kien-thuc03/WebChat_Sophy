/**
 * ZEGO Express WebRTC SDK Mock
 * Phiên bản giả lập cho môi trường phát triển
 */

(function (global) {
  // Tạo class giả lập ZegoExpressEngine
  class ZegoExpressEngine {
    constructor(appID, server) {
      console.log("ZegoExpressEngine mock initialized with appID:", appID);
      this.appID = appID;
      this.server = server;
      this.roomID = "";
      this.localStream = null;
      this.remoteStreams = new Map();
      this.eventHandlers = {};

      // Thông báo khởi tạo thành công
      console.log("ZegoExpressEngine mock ready");
    }

    // Phương thức đăng nhập phòng
    async loginRoom(roomID, token, user, config) {
      console.log("Mock: loginRoom called", {
        roomID,
        token: token.substring(0, 10) + "...",
        user,
        config,
      });
      this.roomID = roomID;

      // Gọi callback roomStateUpdate nếu được đăng ký
      if (this.eventHandlers.roomStateUpdate) {
        setTimeout(() => {
          this.eventHandlers.roomStateUpdate(roomID, "CONNECTED", 0);
        }, 500);
      }

      return true;
    }

    // Phương thức đăng xuất khỏi phòng
    logoutRoom(roomID) {
      console.log("Mock: logoutRoom called", roomID);
      this.roomID = "";

      // Gọi callback roomStateUpdate nếu được đăng ký
      if (this.eventHandlers.roomStateUpdate) {
        this.eventHandlers.roomStateUpdate(roomID, "DISCONNECTED", 0);
      }

      return true;
    }

    // Phương thức tạo stream
    async createStream(config) {
      console.log("Mock: createStream called", config);

      // Tạo giả lập MediaStream
      const mockStream = new MediaStream();
      this.localStream = mockStream;

      return mockStream;
    }

    // Phương thức hủy stream
    destroyStream(stream) {
      console.log("Mock: destroyStream called");
      this.localStream = null;
    }

    // Phương thức bắt đầu phát stream
    async startPublishingStream(streamID, stream) {
      console.log("Mock: startPublishingStream called", streamID);

      // Gọi callback publisherStateUpdate nếu được đăng ký
      if (this.eventHandlers.publisherStateUpdate) {
        this.eventHandlers.publisherStateUpdate({
          state: "PUBLISHING",
          streamID: streamID,
          errorCode: 0,
        });
      }
    }

    // Phương thức dừng phát stream
    stopPublishingStream(streamID) {
      console.log("Mock: stopPublishingStream called", streamID);

      // Gọi callback publisherStateUpdate nếu được đăng ký
      if (this.eventHandlers.publisherStateUpdate) {
        this.eventHandlers.publisherStateUpdate({
          state: "NO_PUBLISH",
          streamID: streamID,
          errorCode: 0,
        });
      }
    }

    // Phương thức bắt đầu phát stream từ người khác
    async startPlayingStream(streamID, options) {
      console.log("Mock: startPlayingStream called", streamID, options);

      // Tạo giả lập MediaStream
      const mockRemoteStream = new MediaStream();
      this.remoteStreams.set(streamID, mockRemoteStream);

      // Gọi callback playerStateUpdate nếu được đăng ký
      if (this.eventHandlers.playerStateUpdate) {
        this.eventHandlers.playerStateUpdate({
          state: "PLAYING",
          streamID: streamID,
          errorCode: 0,
        });
      }

      return mockRemoteStream;
    }

    // Phương thức dừng phát stream từ người khác
    stopPlayingStream(streamID) {
      console.log("Mock: stopPlayingStream called", streamID);
      this.remoteStreams.delete(streamID);

      // Gọi callback playerStateUpdate nếu được đăng ký
      if (this.eventHandlers.playerStateUpdate) {
        this.eventHandlers.playerStateUpdate({
          state: "NO_PLAY",
          streamID: streamID,
          errorCode: 0,
        });
      }
    }

    // Phương thức đăng ký sự kiện
    on(eventName, callback) {
      console.log("Mock: registered event listener", eventName);
      this.eventHandlers[eventName] = callback;
    }

    // Phương thức hủy đăng ký sự kiện
    off(eventName) {
      console.log("Mock: unregistered event listener", eventName);
      delete this.eventHandlers[eventName];
    }
  }

  // Tạo giả lập MediaStream nếu không tồn tại
  if (typeof MediaStream === "undefined") {
    global.MediaStream = class MockMediaStream {
      constructor() {
        this.active = true;
        this.id = "mock-stream-" + Date.now();
        this._tracks = [];
      }

      addTrack(track) {
        this._tracks.push(track);
      }

      removeTrack(track) {
        const index = this._tracks.indexOf(track);
        if (index !== -1) {
          this._tracks.splice(index, 1);
        }
      }

      getTracks() {
        return this._tracks;
      }

      getAudioTracks() {
        return this._tracks.filter((track) => track.kind === "audio");
      }

      getVideoTracks() {
        return this._tracks.filter((track) => track.kind === "video");
      }
    };
  }

  // Đặt ZegoExpressEngine vào global scope
  global.ZegoExpressEngine = ZegoExpressEngine;

  console.log("ZEGO Express WebRTC SDK Mock đã được khởi tạo");
})(typeof window !== "undefined" ? window : global);
