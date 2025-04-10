import io from 'socket.io-client';

const SOCKET_SERVER_URL = 'http://localhost:3000';

class SocketService {
  private socket: any = null;
  private static instance: SocketService;

  private constructor() {}

  public static getInstance(): SocketService {
    if (!SocketService.instance) {
      SocketService.instance = new SocketService();
    }
    return SocketService.instance;
  }

  public connect(): any {
    if (!this.socket || !this.socket.connected) {
      this.socket = io(SOCKET_SERVER_URL);
      this.setupListeners();
    }
    return this.socket;
  }

  public authenticate(userId: string): void {
    if (!this.socket || !this.socket.connected) {
      this.connect();
    }
    if (this.socket) {
      console.log('Authenticating socket with userId:', userId);
      this.socket.emit('authenticate', userId);
    }
  }

  public disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  private setupListeners(): void {
    if (this.socket) {
      this.socket.on('connect', () => {
        console.log('Socket connected:', this.socket?.id);
      });

      this.socket.on('disconnect', (reason: string) => {
        console.log('Socket disconnected:', reason);
      });

      this.socket.on('error', (error: any) => {
        console.error('Socket error:', error);
      });

      // Add additional event listeners as needed
    }
  }

  // Add methods for emitting and handling other socket events as needed
}

export default SocketService.getInstance(); 