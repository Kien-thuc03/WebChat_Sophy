import { initializeApp } from "firebase/app";
import { getAuth, RecaptchaVerifier, signInWithPhoneNumber } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// Định nghĩa kiểu dữ liệu cho đối tượng window
declare global {
  interface Window {
    grecaptcha: any;
    recaptchaVerifier: any;
  }
}

export const firebaseConfig = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: import.meta.env.VITE_FIREBASE_APP_ID,
    measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID
};

// Initialize Firebase
export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

// Đảm bảo reCAPTCHA hiển thị và cấu hình đúng
// Đặt thành false để sử dụng reCAPTCHA thật
auth.settings.appVerificationDisabledForTesting = false;

// Hàm gửi OTP với các tùy chọn cải tiến
export const sendOtpToPhone = async (
  phoneNumber: string, 
  customVerifier?: RecaptchaVerifier,
  backendOTP?: string // Thêm tham số để nhận OTP từ backend
): Promise<any> => {
    // Đảm bảo số điện thoại đúng định dạng
    let formattedPhone = phoneNumber;
    if (phoneNumber.startsWith('0')) {
        formattedPhone = '+84' + phoneNumber.substring(1);
    } else if (!phoneNumber.startsWith('+')) {
        if (phoneNumber.startsWith('84')) {
            formattedPhone = '+' + phoneNumber;
        } else {
            formattedPhone = '+84' + phoneNumber;
        }
    }
    
    console.log('Gửi OTP đến số điện thoại:', formattedPhone);
    
    // Kiểm tra môi trường phát triển
    const isDevelopment = window.location.hostname === 'localhost' || 
                         window.location.hostname === '127.0.0.1';
    
    // Nếu có mã OTP từ backend, ưu tiên sử dụng
    if (backendOTP) {
        console.log('Sử dụng mã OTP từ backend');
        return createFakeOtpHandler(formattedPhone, backendOTP);
    }
    
    // Thử gửi OTP thật ngay cả trong môi trường phát triển
    try {
        // Nếu có customVerifier, thử gửi OTP thật
        if (customVerifier) {
            console.log('Đang thử gửi OTP thật qua SMS...');
            try {
                const confirmationResult = await signInWithPhoneNumber(auth, formattedPhone, customVerifier);
                console.log('Đã gửi OTP thành công qua SMS');
                return confirmationResult;
            } catch (error: any) {
                console.error('Lỗi khi gửi SMS:', error);
                
                // Nếu đang trong môi trường phát triển và gặp lỗi, sử dụng mã giả lập
                if (isDevelopment) {
                    console.warn('Không thể gửi OTP thật, sử dụng mã giả lập 123456 trong môi trường phát triển');
                    return createFakeOtpHandler(formattedPhone);
                }
                
                throw error;
            }
        }
        
        // Các trường hợp còn lại (không có customVerifier)
        const recaptchaElements = document.getElementsByClassName('g-recaptcha');
        
        if (recaptchaElements.length === 0) {
            console.error('Không tìm thấy widget reCAPTCHA - có thể bị chặn hoặc chưa tải');
            
            // Trong môi trường phát triển, dùng mã giả lập
            if (isDevelopment) {
                console.warn('Không tìm thấy widget reCAPTCHA, sử dụng mã giả lập 123456');
                return createFakeOtpHandler(formattedPhone);
            }
            
            throw new Error('Widget reCAPTCHA không được tìm thấy');
        }
        
        // Tìm RecaptchaVerifier đã tồn tại
        const existingVerifier = window.recaptchaVerifier;
        
        if (!existingVerifier) {
            console.log('Không tìm thấy RecaptchaVerifier toàn cục');
            
            // Trong môi trường phát triển, dùng mã giả lập
            if (isDevelopment) {
                console.warn('Không tìm thấy RecaptchaVerifier, sử dụng mã giả lập 123456');
                return createFakeOtpHandler(formattedPhone);
            }
            
            throw new Error('Không tìm thấy RecaptchaVerifier');
        }
        
        try {
            // Gửi SMS OTP sử dụng appVerifier hiện có
            const confirmationResult = await signInWithPhoneNumber(auth, formattedPhone, existingVerifier);
            console.log('Đã gửi OTP thành công qua SMS');
            return confirmationResult;
        } catch (error: any) {
            console.error('Lỗi khi gửi SMS:', error);
            
            // Trong môi trường phát triển, dùng mã giả lập khi có lỗi
            if (isDevelopment) {
                console.warn('Không thể gửi OTP thật, sử dụng mã giả lập 123456');
                return createFakeOtpHandler(formattedPhone);
            }
            
            // Xử lý lỗi auth/invalid-app-credential
            if (error.code === 'auth/invalid-app-credential' || error.code === 'auth/internal-error') {
                console.warn('Lỗi Firebase - Cần kiểm tra lại cấu hình Firebase');
                console.log('Lỗi này thường do chưa cấu hình đúng Firebase hoặc chưa kích hoạt thanh toán');
                console.log('Vui lòng kiểm tra tài khoản Firebase của bạn, đảm bảo Phone Authentication đã được bật và có phương thức thanh toán hợp lệ');
                
                // Nếu trong môi trường phát triển, dùng mã giả lập
                if (isDevelopment) {
                    return createFakeOtpHandler(formattedPhone);
                }
            }
            
            // Chuyển tiếp lỗi cho UI xử lý
            throw error;
        }
    } catch (error: any) {
        // Bắt tất cả lỗi khác
        console.error('Lỗi tổng thể khi gửi OTP:', error);
        
        // Trong môi trường phát triển, luôn fallback về mã giả lập
        if (isDevelopment) {
            console.warn('Sử dụng mã giả lập 123456 do lỗi khi gửi OTP thật');
            return createFakeOtpHandler(formattedPhone);
        }
        
        throw error;
    }
};

// Hàm tạo handler OTP giả lập để sử dụng trong môi trường phát triển
function createFakeOtpHandler(phoneNumber: string, backendOTP?: string) {
    // Sử dụng mã OTP từ backend nếu có, nếu không thì dùng 123456
    const otpCode = backendOTP || '123456';
    
    console.log(`Tạo handler OTP giả lập với ${backendOTP ? 'mã từ backend: ' + backendOTP : 'mã mặc định 123456'}`);
    
    return {
        verificationId: 'test-verification-id-fallback',
        confirm: async (code: string) => {
            console.log('Kiểm tra mã fallback:', code);
            console.log('Mã OTP dự kiến:', otpCode);
            console.log('Mã từ backend có được sử dụng:', !!backendOTP);
            console.log('So sánh code === otpCode:', code === otpCode);
            
            // Kiểm tra mã OTP nhập vào có khớp với mã từ backend hoặc mã mặc định không
            if (code === otpCode) {
                console.log('Xác thực OTP thành công với mã:', otpCode);
                return { 
                    user: { 
                        uid: 'test-user-id-fallback',
                        phoneNumber: phoneNumber 
                    } 
                };
            } else {
                console.error('Mã OTP không khớp. Nhập vào:', code, 'Mã kỳ vọng:', otpCode);
                throw { 
                    code: 'auth/invalid-verification-code',
                    message: 'Mã xác thực không hợp lệ' 
                };
            }
        }
    };
}

export default app;
