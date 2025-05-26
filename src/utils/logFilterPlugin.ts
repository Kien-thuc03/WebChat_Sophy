/**
 * Filter Zego logs để giữ cho Console sạch sẽ
 * Plugin này lọc các log từ ZegoExpress và các thư viện liên quan
 */

// Lưu các phương thức console gốc
const originalConsole = {
  log: console.log,
  info: console.info,
  warn: console.warn,
  error: console.error,
  debug: console.debug,
};

// Mặc định tắt logs
let enableZegoLogs = false;

// Mảng các chuỗi cần lọc
const filterPatterns = [
  "zego",
  "zc.",
  "zn.",
  "zm.",
  "zl.",
  "weblogger",
  "coolzcloud",
  "ZegoExpressWeb",
  "[MGR]",
  "WebSocket connection to",
  "log websocket",
  "callInvitation",
];

/**
 * Kiểm tra xem log có phải từ Zego không
 */
const isZegoLog = (message: unknown): boolean => {
  if (typeof message === "string") {
    // Kiểm tra các pattern trong chuỗi
    return (
      filterPatterns.some((pattern) => message.includes(pattern)) ||
      (message.startsWith("{") && message.includes("appid"))
    );
  } else if (typeof message === "object" && message !== null) {
    // Kiểm tra nếu object chứa thông tin liên quan đến Zego
    const messageStr = String(message);
    return (
      messageStr.includes("zego") ||
      messageStr.includes("appid") ||
      messageStr.includes("roomid")
    );
  }
  return false;
};

/**
 * Bật/tắt logs từ Zego
 */
export const toggleZegoLogs = (enabled: boolean): void => {
  enableZegoLogs = enabled;
  // Không in ra thông báo nữa
};

/**
 * Khởi tạo bộ lọc console
 */
export const initializeLogFilter = (): void => {
  // Ghi đè phương thức console.log
  console.log = function (...args: unknown[]) {
    // Chỉ hiển thị log từ Zego khi được bật
    if (args.length > 0 && isZegoLog(args[0])) {
      if (enableZegoLogs) {
        originalConsole.log.apply(console, args);
      }
    }
    // Tắt tất cả logs khác
  };

  // Ghi đè phương thức console.info
  console.info = function (...args: unknown[]) {
    // Chỉ hiển thị info từ Zego khi được bật
    if (args.length > 0 && isZegoLog(args[0])) {
      if (enableZegoLogs) {
        originalConsole.info.apply(console, args);
      }
    }
    // Tắt tất cả info logs khác
  };

  // Ghi đè phương thức console.warn
  console.warn = function (...args: unknown[]) {
    if (
      args.length > 0 &&
      isZegoLog(args[0]) &&
      typeof args[0] === "string" &&
      !args[0].includes("critical")
    ) {
      if (enableZegoLogs) {
        originalConsole.warn.apply(console, args);
      }
      return;
    }
    // Giữ lại các warnings không liên quan đến Zego
    originalConsole.warn.apply(console, args);
  };

  // Ghi đè phương thức console.error
  console.error = function (...args: unknown[]) {
    if (args.length > 0 && isZegoLog(args[0])) {
      // Chỉ cho phép lỗi nghiêm trọng được hiển thị
      const argStr = String(args[0]);
      if (argStr.includes("critical error") || enableZegoLogs) {
        originalConsole.error.apply(console, args);
      }
      return;
    }
    // Vẫn hiển thị các lỗi không liên quan đến Zego
    originalConsole.error.apply(console, args);
  };

  // Ghi đè phương thức console.debug
  console.debug = function (...args: unknown[]) {
    if (args.length > 0 && isZegoLog(args[0])) {
      if (enableZegoLogs) {
        originalConsole.debug.apply(console, args);
      }
    }
    // Tắt tất cả debug logs khác
  };

  // Không hiển thị thông báo khởi tạo thành công nữa
};

// Khởi tạo bộ lọc ngay khi module được import
initializeLogFilter();

// Export mặc định cho việc sử dụng đơn giản
export default {
  initializeLogFilter,
  toggleZegoLogs,
};
