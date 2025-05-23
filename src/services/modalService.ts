type Listener<T> = (data: T) => void;

class SimpleEventEmitter<T> {
  private listeners: Listener<T>[] = [];
  
  subscribe(listener: Listener<T>) {
    this.listeners.push(listener);
    return {
      unsubscribe: () => {
        this.listeners = this.listeners.filter(l => l !== listener);
      }
    };
  }
  
  next(data: T) {
    this.listeners.forEach(listener => listener(data));
  }
}

export interface ModalOptions {
  title?: string;
  message: string;
  type?: "info" | "warning" | "error" | "success";
  showClose?: boolean;
  onClose?: () => void;
  redirectUrl?: string;
  autoClose?: boolean;
  autoCloseDelay?: number;
}

class ModalService {
  private static instance: ModalService;
  private modalSubject = new SimpleEventEmitter<ModalOptions | null>();

  public modalState$ = this.modalSubject;

  private constructor() {}

  public static getInstance(): ModalService {
    if (!ModalService.instance) {
      ModalService.instance = new ModalService();
    }
    return ModalService.instance;
  }

  showModal(options: ModalOptions): void {
    this.modalSubject.next(options);
  }

  closeModal(): void {
    this.modalSubject.next(null);
  }

  showAuthErrorModal(message: string = "Tài khoản đang được đăng nhập ở một thiết bị khác"): void {
    this.showModal({
      title: "Phiên đăng nhập hết hạn",
      message,
      type: "error",
      showClose: false,
      redirectUrl: "/",
      autoClose: true,
      autoCloseDelay: 3000
    });
  }
}

export default ModalService.getInstance(); 