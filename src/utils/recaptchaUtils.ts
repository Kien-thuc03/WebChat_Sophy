// Khai báo kiểu dữ liệu cho grecaptcha
declare global {
  interface Window {
    grecaptcha: {
      enterprise?: {
        ready: (callback: () => void) => void;
        execute: (
          siteKey: string, 
          options: { action: string }
        ) => Promise<string>;
      };
      // Thêm khai báo cho reCAPTCHA thông thường
      ready?: (callback: () => void) => void;
      execute?: (
        siteKey: string, 
        options: { action: string }
      ) => Promise<string>;
    };
  }
}

// Site key của reCAPTCHA
export const RECAPTCHA_SITE_KEY = '6LfBuBMrAAAAAKEtW7E-BdJyvgLTl6ywfO4avdCT';

/**
 * Chuẩn bị reCAPTCHA container cho Firebase Phone Auth
 * @returns Promise<void>
 */
export const prepareRecaptchaContainer = async (): Promise<void> => {
  // Đảm bảo container tồn tại
  let container = document.getElementById('recaptcha-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'recaptcha-container';
    container.style.position = 'fixed';
    container.style.bottom = '20px';
    container.style.right = '20px';
    container.style.zIndex = '9999';
    container.style.backgroundColor = 'rgba(255, 255, 255, 0.9)';
    container.style.padding = '10px';
    container.style.borderRadius = '4px';
    container.style.boxShadow = '0 2px 10px rgba(0, 0, 0, 0.2)';
    document.body.appendChild(container);
    
    console.log('RecaptchaUtils: Created container');
  } else {
    // Clear previous reCAPTCHA if any
    container.innerHTML = '';
  }
};

/**
 * Thực thi reCAPTCHA và lấy token
 * @param action Hành động của người dùng (ví dụ: 'register', 'login', 'send_otp')
 * @returns Token từ reCAPTCHA
 */
export const executeRecaptcha = async (action: string): Promise<string> => {
  const isDevelopment = window.location.hostname === 'localhost' || 
                        window.location.hostname === '127.0.0.1';
  
  try {
    // Đảm bảo reCAPTCHA container sẵn sàng
    await prepareRecaptchaContainer();
    
    // Đảm bảo reCAPTCHA đã được tải
    if (!window.grecaptcha) {
      console.warn('reCAPTCHA not loaded yet');
      if (isDevelopment) {
        return 'test-recaptcha-token';
      }
      throw new Error('reCAPTCHA not loaded. Please refresh the page.');
    }
    
    // Ưu tiên sử dụng reCAPTCHA Enterprise nếu có
    if (window.grecaptcha.enterprise && 
        typeof window.grecaptcha.enterprise.ready === 'function' && 
        typeof window.grecaptcha.enterprise.execute === 'function') {
      const token = await new Promise<string>((resolve, reject) => {
        window.grecaptcha.enterprise!.ready(async () => {
          try {
            const result = await window.grecaptcha.enterprise!.execute(
              RECAPTCHA_SITE_KEY,
              { action }
            );
            resolve(result);
          } catch (error) {
            reject(error);
          }
        });
      });
      return token;
    }
    
    // Fallback to standard reCAPTCHA
    if (window.grecaptcha.ready && window.grecaptcha.execute) {
      const token = await new Promise<string>((resolve, reject) => {
        window.grecaptcha.ready!(async () => {
          try {
            const result = await window.grecaptcha.execute!(
              RECAPTCHA_SITE_KEY,
              { action }
            );
            resolve(result);
          } catch (error) {
            reject(error);
          }
        });
      });
      return token;
    }
    
    throw new Error('No supported reCAPTCHA version found');
  } catch (error) {
    console.error('reCAPTCHA execution failed:', error);
    if (isDevelopment) {
      return 'test-recaptcha-token-error';
    }
    throw error;
  }
};

export default executeRecaptcha; 