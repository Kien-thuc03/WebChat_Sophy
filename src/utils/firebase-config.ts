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
    apiKey: "AIzaSyC9c6CCt_qpQyXzcqLaAqezM7h9PfJNuFg",
    authDomain: "webchatsophy.firebaseapp.com",
    projectId: "webchatsophy",
    storageBucket: "webchatsophy.firebasestorage.app",
    messagingSenderId: "789633891442",
    appId: "1:789633891442:web:ab3adb096ed0d880ac56eb",
    measurementId: "G-5KT8Z4NDH2"
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
  customVerifier?: RecaptchaVerifier
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
    
    // Đối với môi trường phát triển, luôn sử dụng mã OTP giả lập để tránh các vấn đề reCAPTCHA
    if (isDevelopment) {
        console.log('Môi trường phát triển: Sử dụng mã OTP giả lập 123456');
        return createFakeOtpHandler(formattedPhone);
    }
    
    // Phần còn lại chỉ chạy trong môi trường production
    try {
        // Sử dụng verifier được truyền vào nếu có
        if (customVerifier) {
            console.log('Sử dụng RecaptchaVerifier đã được cung cấp');
            try {
                // Gửi SMS OTP sử dụng appVerifier được cung cấp
                const confirmationResult = await signInWithPhoneNumber(auth, formattedPhone, customVerifier);
                console.log('Đã gửi OTP thành công');
                return confirmationResult;
            } catch (error: any) {
                console.error('Lỗi khi gửi SMS:', error);
                throw error;
            }
        }
        
        // Nếu không có customVerifier, tìm kiếm widget reCAPTCHA
        const recaptchaElements = document.getElementsByClassName('g-recaptcha');
        
        if (recaptchaElements.length === 0) {
            console.error('Không tìm thấy widget reCAPTCHA - có thể bị chặn hoặc chưa tải');
            throw new Error('Widget reCAPTCHA không được tìm thấy');
        }
        
        // Tìm RecaptchaVerifier đã tồn tại
        const existingVerifier = window.recaptchaVerifier;
        
        if (!existingVerifier) {
            console.log('Không tìm thấy RecaptchaVerifier toàn cục, sử dụng container đã tạo');
            throw new Error('Không tìm thấy RecaptchaVerifier');
        }
        
        try {
            // Gửi SMS OTP sử dụng appVerifier đã được tạo trong RecaptchaModal
            const confirmationResult = await signInWithPhoneNumber(auth, formattedPhone, existingVerifier);
            console.log('Đã gửi OTP thành công');
            return confirmationResult;
        } catch (error: any) {
            console.error('Lỗi khi gửi SMS:', error);
            
            // Xử lý lỗi auth/invalid-app-credential
            if (error.code === 'auth/invalid-app-credential' || error.code === 'auth/internal-error') {
                console.warn('Lỗi Firebase - Cần kiểm tra lại cấu hình Firebase');
                console.log('Lỗi này thường do chưa cấu hình đúng Firebase hoặc chưa kích hoạt thanh toán');
                console.log('Vui lòng kiểm tra tài khoản Firebase của bạn, đảm bảo Phone Authentication đã được bật và có phương thức thanh toán hợp lệ');
            }
            
            // Chuyển tiếp lỗi cho UI xử lý
            throw error;
        }
    } catch (error: any) {
        console.error('Lỗi khi gửi OTP:', error);
        throw error;
    }
};

// Hàm tạo handler OTP giả lập để sử dụng trong môi trường phát triển
function createFakeOtpHandler(phoneNumber: string) {
    return {
        verificationId: 'test-verification-id-fallback',
        confirm: async (code: string) => {
            console.log('Kiểm tra mã fallback:', code);
            
            // Trong môi trường phát triển, cho phép mã 123456 hoạt động
            if (code === '123456') {
                return { 
                    user: { 
                        uid: 'test-user-id-fallback',
                        phoneNumber: phoneNumber 
                    } 
                };
            } else {
                throw { 
                    code: 'auth/invalid-verification-code',
                    message: 'Mã xác thực không hợp lệ' 
                };
            }
        }
    };
}

export default app;
