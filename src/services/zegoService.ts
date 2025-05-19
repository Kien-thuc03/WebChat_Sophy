import { ZegoExpressEngine } from 'zego-express-engine-webrtc';

class ZegoService {
  private zg: ZegoExpressEngine | null = null;
  private appID: number | null = null;
  private server: string | null = null;

  initialize(
    container: HTMLElement,
    config: { appID: number; server: string; userID: string; userName: string; token: string; roomID: string },
    onDestroy?: () => void
  ) {
    if (this.zg) {
      console.warn('ZegoService is already initialized');
      return;
    }

    this.appID = config.appID;
    this.server = config.server;
    this.zg = new ZegoExpressEngine(config.appID, config.server);

    // Login to room
    this.zg.loginRoom(
      config.roomID,
      config.token,
      { userID: config.userID, userName: config.userName },
      { userUpdate: true }
    ).then(() => {
      console.log('Logged into ZEGO room:', config.roomID);
    }).catch(error => {
      console.error('Failed to login to ZEGO room:', error);
    });
  }

  destroy() {
    if (this.zg) {
      this.zg.logoutRoom();
      this.zg.off('roomStateUpdate');
      this.zg.off('roomUserUpdate');
      this.zg.off('roomStreamUpdate');
      this.zg.off('publisherStateUpdate');
      this.zg.off('playerStateUpdate');
      this.zg = null;
      this.appID = null;
      this.server = null;
    }
  }

  isInitialized(): boolean {
    return !!this.zg;
  }
}

export const zegoService = new ZegoService();