import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { checkUsedPhone, registerWithAvatar } from '../../api/API';
import { useAuth } from '../../features/auth/hooks/useAuth';
import PhoneInput from "react-phone-number-input";
import "react-phone-number-input/style.css";
import { auth, sendOtpToPhone } from '../../utils/firebase-config';
import RecaptchaContainer from './RecaptchaContainer';
import { ConfirmationResult, RecaptchaVerifier } from 'firebase/auth';

// Định nghĩa interface cho kết quả xác thực
interface IConfirmationResult {
  verificationId: string;
  confirm: (code: string) => Promise<any>;
}

// Helper function to safely check if grecaptcha is ready
function isGrecaptchaReady(): boolean {
  return (
    typeof window !== 'undefined' &&
    window.grecaptcha !== undefined &&
    typeof window.grecaptcha.ready === 'function'
  );
}

const Register: React.FC = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [step, setStep] = useState<'phone' | 'otp' | 'name' | 'info'>('phone');
  const [phone, setPhone] = useState('');
  const [formattedPhoneNumber, setFormattedPhoneNumber] = useState('');
  const [otp, setOtp] = useState('');
  const [backendOTP, setBackendOTP] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullname, setFullname] = useState('');
  const [isMale, setIsMale] = useState<boolean>(true);
  const [birthday, setBirthday] = useState('');
  const [error, setError] = useState('');
  const [resendTimer, setResendTimer] = useState(0);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState('');
  const [isPhoneUsed, setIsPhoneUsed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [showRecaptcha, setShowRecaptcha] = useState(false);
  const [recaptchaVerified, setRecaptchaVerified] = useState(false);
  
  // Tham chiếu để lưu confirmation result từ Firebase
  const confirmationResultRef = useRef<IConfirmationResult | null>(null);
  const recaptchaVerifierRef = useRef<RecaptchaVerifier | null>(null);
  
  // Kiểm tra môi trường development
  const isDevelopment = window.location.hostname === 'localhost' || 
                        window.location.hostname === '127.0.0.1';

  // Xử lý khi reCAPTCHA được xác thực
  const handleRecaptchaVerified = async (verifier: RecaptchaVerifier) => {
    recaptchaVerifierRef.current = verifier;
    setRecaptchaVerified(true);
    
    // Set loading state
    setIsLoading(true);
    
    // Validate phone number format again
    const phoneRegex = /^\+84\d{9}$/;
    if (!phoneRegex.test(formattedPhoneNumber)) {
      setError('Định dạng số điện thoại không hợp lệ. Vui lòng kiểm tra lại.');
      setShowRecaptcha(false);
      setIsLoading(false);
      return;
    }
    
    // Use setTimeout to ensure reCAPTCHA has fully completed its verification
    // before attempting to send the OTP
    setTimeout(async () => {
      try {
        // Gửi OTP với verifier đã xác thực và OTP từ backend nếu có
        const confirmationResult = await sendOtpToPhone(formattedPhoneNumber, verifier, backendOTP);
        
        // Lưu confirmation result để sử dụng khi xác thực OTP
        confirmationResultRef.current = confirmationResult;
        
        // Chỉ ẩn reCAPTCHA sau khi gửi OTP thành công
        setShowRecaptcha(false);
        
        // Chuyển sang bước nhập OTP
        setTimeout(() => {
          // Nếu chưa ở bước OTP, chuyển sang bước đó
          if (step !== 'otp') {
            setStep('otp');
          }
          
          // Luôn set lại timer khi gửi OTP thành công
          setResendTimer(60);
          setIsPhoneUsed(false);
          
          // Hiển thị thông báo OTP dựa trên loại OTP được sử dụng
          if (isDevelopment) {
            if (backendOTP) {
              setSuccessMessage(`Mã OTP đã được gửi đến số điện thoại của bạn. Dev mode: Sử dụng mã OTP ${backendOTP}`);
            } else {
              setSuccessMessage('Mã OTP đã được gửi đến số điện thoại của bạn. Trong môi trường development, hãy sử dụng mã: 123456');
            }
          } else {
            setSuccessMessage('Mã OTP đã được gửi đến số điện thoại của bạn');
          }
          
          // Clear loading state
          setIsLoading(false);
        }, 300);
      } catch (err: any) {
        console.error('Lỗi khi gửi OTP:', err);
        setShowRecaptcha(false);
        handleOtpError(err);
        setIsLoading(false);
      }
    }, 500); // Give time for reCAPTCHA to fully complete
  };

  // Cleanup when changing steps
  const changeStep = (newStep: 'phone' | 'otp' | 'name' | 'info') => {
    // Hide reCAPTCHA first
    setShowRecaptcha(false);
    
    // Reset backend OTP if going back to phone step
    if (newStep === 'phone') {
      setBackendOTP('');
    }
    
    // Only perform cleanup when not in the middle of verification
    if (!recaptchaVerified && newStep !== 'otp') {
      // Clean up any existing reCAPTCHA
      try {
        if (window.recaptchaVerifier && typeof window.recaptchaVerifier.clear === 'function') {
          window.recaptchaVerifier.clear();
          window.recaptchaVerifier = null;
        }
        
        // Remove any reCAPTCHA iframes or containers
        document.querySelectorAll('.g-recaptcha').forEach(el => {
          try {
            if (!el.closest('#inline-recaptcha-container')) {
              (el as Element).remove();
            }
          } catch (error) {
          }
        });
      } catch (error) {
      }
    }
    
    // Now set the new step
    setTimeout(() => {
      setStep(newStep);
    }, 100);
  };

  // Xử lý lỗi khi gửi OTP
  const handleOtpError = (err: any) => {
    if (err.code === 'auth/invalid-phone-number') {
      setError('Định dạng số điện thoại không hợp lệ. Vui lòng kiểm tra lại.');
    } else if (err.code === 'auth/too-many-requests') {
      setError('Quá nhiều yêu cầu. Vui lòng thử lại sau một lúc.');
    } else if (err.code === 'auth/captcha-check-failed') {
      setError('Xác thực reCAPTCHA thất bại. Vui lòng thử lại.');
    } else if (err.code === 'auth/invalid-app-credential') {
      setError('Lỗi cài đặt reCAPTCHA. Đang sử dụng mã OTP giả lập: 123456');
      // Trong môi trường development với lỗi Firebase credential, chuyển sang sử dụng mã giả lập
      if (step !== 'otp') {
        setStep('otp');
      }
      setResendTimer(60);
      setSuccessMessage('Đã xảy ra lỗi, nhưng bạn có thể tiếp tục với mã OTP: 123456');
    } else if (isDevelopment) {
      // Nếu là môi trường development và có lỗi Firebase, vẫn cho phép tiếp tục
      if (step !== 'otp') {
        setStep('otp');
      }
      setResendTimer(60);
      if (backendOTP) {
        setSuccessMessage(`Dev mode: Đã xảy ra lỗi Firebase nhưng bạn có thể tiếp tục với mã OTP từ backend: ${backendOTP}`);
      } else {
        setSuccessMessage('Dev mode: Đã xảy ra lỗi Firebase nhưng bạn có thể tiếp tục với mã OTP: 123456');
      }
    } else {
      setError(err.message || 'Đã xảy ra lỗi khi gửi OTP. Vui lòng thử lại sau.');
    }
    setIsLoading(false);
  };

  // Update the OTP submit handler
  const handleOtpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    
    // Ensure OTP is properly formatted (trim whitespace and ensure it's a string)
    const cleanOtp = (otp || '').trim();
    if (cleanOtp !== otp) {
      setOtp(cleanOtp);
    }
    
    try {
      if (!confirmationResultRef.current) {
        throw new Error('Không tìm thấy phiên xác thực. Vui lòng yêu cầu mã OTP mới.');
      }
      
      
      // Xác thực OTP thông qua Firebase
      const result = await confirmationResultRef.current.confirm(cleanOtp);
      
      if (result.user) {
        // Use the changeStep function to ensure cleanup
        changeStep('name');
        setSuccessMessage('Số điện thoại đã được xác thực');
      } else {
        throw new Error('Xác thực thất bại');
      }
    } catch (err: any) {
      console.error("Lỗi xác thực OTP:", err);
      console.error("Chi tiết lỗi:", JSON.stringify(err, null, 2));
      
      if (err.code === 'auth/invalid-verification-code') {
        setError('Mã OTP không chính xác. Vui lòng kiểm tra và thử lại.');
      } else if (err.code === 'auth/code-expired') {
        setError('Mã OTP đã hết hạn. Vui lòng yêu cầu mã mới.');
        setResendTimer(0);
      } else {
        setError(err.message || 'Xác thực OTP thất bại. Vui lòng thử lại.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Thêm hàm xử lý cho bước nhập tên
  const handleNameSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    // Kiểm tra tên với regex cập nhật - yêu cầu ít nhất 2 từ cách nhau bởi dấu cách
    const nameRegex = /^[A-Za-zÀ-ỹ]+ [A-Za-zÀ-ỹ]+( [A-Za-zÀ-ỹ]+)*$/;
    if (!nameRegex.test(fullname)) {
      setError('Họ và tên phải có ít nhất 2 từ (họ và tên) cách nhau bởi dấu cách');
      return;
    }
    
    // Kiểm tra độ dài
    if (fullname.length < 3 || fullname.length > 50) {
      setError('Họ và tên phải từ 3-50 ký tự');
      return;
    }
    
    // If name is valid, use changeStep function
    changeStep('info');
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMessage('');
    setIsLoading(true);
    
    try {
      // Cập nhật regex cho mật khẩu
      const passwordRegex = /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d]{6,20}$/;
      if (!passwordRegex.test(password)) {
        setError('Mật khẩu phải từ 6-20 ký tự, bao gồm chữ và số');
        setIsLoading(false);
        return;
      }
      
      if (password !== confirmPassword) {
        setError('Mật khẩu xác nhận không khớp');
        setIsLoading(false);
        return;
      }

      // Kiểm tra định dạng số điện thoại
      let formattedPhone = phone;
      if (phone.startsWith("+84")) {
        formattedPhone = "0" + phone.slice(3);
      }

      // Kiểm tra tuổi - phải đủ 13 tuổi
      if (birthday) {
        const birthDate = new Date(birthday);
        const today = new Date();
        let age = today.getFullYear() - birthDate.getFullYear();
        const monthDiff = today.getMonth() - birthDate.getMonth();
        
        // Nếu chưa đến tháng sinh nhật trong năm nay, trừ đi 1 tuổi
        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
          age--;
        }
        
        if (age < 13) {
          setError('Bạn phải đủ 13 tuổi để đăng ký tài khoản');
          setIsLoading(false);
          return;
        }
      }

      // Thông báo nếu có avatar
      if (avatarFile) {
        setSuccessMessage('Đang tải lên ảnh đại diện...');
      }

      // Sử dụng hàm registerWithAvatar thay vì register để hỗ trợ tải lên avatar
      const result = await registerWithAvatar(
        formattedPhone, 
        password, 
        fullname, 
        isMale, 
        birthday,
        avatarFile
      );
      
      
      // Hiển thị thông báo thành công
      setSuccessMessage('Đăng ký thành công! Đang đăng nhập...');
      
      try {
        // Tự động đăng nhập sau khi đăng ký thành công
        await login({
          phone: formattedPhone,
          password: password
        });
        
        // Đợi một chút để hiển thị thông báo thành công
        setTimeout(() => {
          // Chuyển hướng đến trang chính sau khi đăng nhập
          navigate('/main');
        }, 1000);
      } catch (loginError) {
        console.error('Lỗi khi tự động đăng nhập:', loginError);
        setError('Đăng ký thành công nhưng không thể tự động đăng nhập. Vui lòng đăng nhập thủ công.');
        
        // Nếu đăng nhập thất bại, vẫn chuyển hướng về trang đăng nhập sau một khoảng thời gian
        setTimeout(() => {
          navigate('/');
        }, 2000);
      }
    } catch (err: any) {
      console.error('Lỗi đăng ký:', err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  // Cleanup any existing reCAPTCHA widgets when component unmounts
  useEffect(() => {
    // Global cleanup on initial mount
    const cleanupGlobalRecaptcha = () => {
      try {
        // Clean up only UI-related reCAPTCHA elements
        // Remove any orphaned iframe elements or badges
        document.querySelectorAll('.grecaptcha-badge').forEach(el => {
          try {
            if (el.parentNode) {
              (el.parentNode as Element).removeChild(el);
            }
          } catch (error) {
          }
        });
        
        // Hide reCAPTCHA iframes but don't remove them to preserve functionality
        document.querySelectorAll('iframe[src*="recaptcha"]').forEach(iframe => {
          try {
            const parent = iframe.parentElement;
            if (parent && parent.parentElement && !parent.closest('#inline-recaptcha-container')) {
              const parentElement = parent.parentElement as HTMLElement;
              parentElement.style.visibility = 'hidden'; // Use visibility instead of display to preserve functionality
            }
          } catch (error) {
          }
        });
        
        // Only remove extra g-recaptcha elements that aren't in the main container
        document.querySelectorAll('.g-recaptcha').forEach(el => {
          try {
            if (!el.closest('#inline-recaptcha-container')) {
              // Just hide instead of removing to maintain internal references
              const element = el as HTMLElement;
              element.style.visibility = 'hidden';
            }
          } catch (error) {
          }
        });
      } catch (error) {
        console.error('Error in UI reCAPTCHA cleanup:', error);
      }
    };

    // Run cleanup on mount
    cleanupGlobalRecaptcha();
    
    // Run cleanup on unmount 
    return cleanupGlobalRecaptcha;
  }, []);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (resendTimer > 0) {
      interval = setInterval(() => {
        setResendTimer(prev => prev - 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [resendTimer]);

  useEffect(() => {
    if (step === 'otp' && 'OTPCredential' in window && confirmationResultRef.current) {
      const ac = new AbortController();
      navigator.credentials.get({
        otp: { transport: ['sms'] },
        signal: ac.signal
      } as any).then(otp => {
        if (otp && typeof otp === 'object' && 'code' in otp) {
          const otpCode = String(otp.code);
          setOtp(otpCode);
          
          // Auto-submit OTP if detected
          if (otpCode.length === 6 && /^\d{6}$/.test(otpCode)) {
            // Validate the OTP immediately if it has the correct format
            // But do it after a small delay to let state update
            setTimeout(async () => {
              if (confirmationResultRef.current) {
                try {
                  setIsLoading(true);
                  const result = await confirmationResultRef.current.confirm(otpCode);
                  
                  if (result.user) {
                    // Use the changeStep function to ensure cleanup
                    changeStep('name');
                    setSuccessMessage('Số điện thoại đã được xác thực');
                  }
                } catch (err) {
                  console.error('Lỗi khi xác thực OTP tự động:', err);
                  // Don't show error for auto-detection
                } finally {
                  setIsLoading(false);
                }
              }
            }, 500);
          }
        }
      }).catch(() => {});
      return () => ac.abort();
    }
  }, [step]);

  // Reset recaptcha when step changes
  useEffect(() => {
    if (step !== 'phone') {
      setShowRecaptcha(false);
    }
  }, [step]);

  // Handle phone submit to show reCAPTCHA
  const handlePhoneSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    setSuccessMessage('');
    setRecaptchaVerified(false);
    setBackendOTP(''); // Reset any stored backend OTP when attempting new verification
    
    try {
      // Kiểm tra định dạng số điện thoại
      if (!phone || (typeof phone !== 'string')) {
        setError('Vui lòng nhập số điện thoại hợp lệ');
        setIsLoading(false);
        return;
      }
      
      // Đảm bảo số điện thoại đúng định dạng quốc tế (bắt đầu bằng +)
      let formattedPhone = phone;
      
      // Nếu bắt đầu bằng 0, chuyển sang định dạng +84
      if (phone.startsWith("0")) {
        formattedPhone = "+84" + phone.substring(1);
      } 
      // Nếu chưa có mã quốc gia
      else if (!phone.startsWith("+")) {
        // Nếu bắt đầu bằng '84', thêm dấu +
        if (phone.startsWith('84')) {
          formattedPhone = "+" + phone;
        } else {
          // Mặc định thêm mã Việt Nam +84
          formattedPhone = "+84" + phone;
        }
      }
      
      // Kiểm tra định dạng số điện thoại theo định dạng Việt Nam
      const phoneRegex = /^\+84\d{9}$/;
      if (!phoneRegex.test(formattedPhone)) {
        setError('Định dạng số điện thoại không hợp lệ. Vui lòng kiểm tra lại.');
        setIsLoading(false);
        return;
      }
      
      
      // Lưu số điện thoại đã định dạng để sử dụng trong callback
      setFormattedPhoneNumber(formattedPhone);
      
      // Kiểm tra số điện thoại đã được sử dụng chưa (sử dụng API hiện tại)
      try {
        const apiFormattedPhone = formattedPhone.startsWith("+84") 
          ? "0" + formattedPhone.substring(3) 
          : formattedPhone;
          
        // Lưu response để lấy mã OTP từ backend nếu có
        const response = await checkUsedPhone(apiFormattedPhone);
        
        // Nếu có phản hồi hợp lệ từ API, xử lý tiếp theo
        if (response && isDevelopment) {
          if (response.otp) {
            // Lưu mã OTP từ backend vào state để sử dụng sau này
            setBackendOTP(response.otp);
            
            // Nếu đã ở bước OTP, gửi OTP ngay bằng cách sử dụng RecaptchaVerifier hiện có 
            // hoặc fake OTP với backendOTP
            if (step === 'otp') {
              if (recaptchaVerifierRef.current) {
                // Có RecaptchaVerifier, thử gửi OTP thật với backend OTP làm fallback
                try {
                  const result = await sendOtpToPhone(formattedPhone, recaptchaVerifierRef.current, response.otp);
                  confirmationResultRef.current = result;
                  setSuccessMessage(`Mã OTP đã được gửi lại. Dev mode: Sử dụng mã OTP ${response.otp}`);
                  setResendTimer(60);
                } catch (otpErr) {
                  console.error('Lỗi khi gửi lại OTP:', otpErr);
                  // Vẫn hiển thị thông báo vì đã có mã từ backend
                  setSuccessMessage(`Mã OTP đã được gửi lại. Dev mode: Sử dụng mã OTP ${response.otp}`);
                  setResendTimer(60);
                }
              } else {
                // Không có RecaptchaVerifier, sử dụng trực tiếp backend OTP
                const result = await sendOtpToPhone(formattedPhone, undefined, response.otp);
                confirmationResultRef.current = result;
                setSuccessMessage(`Mã OTP đã được gửi lại. Dev mode: Sử dụng mã OTP ${response.otp}`);
                setResendTimer(60);
              }
              
              setIsLoading(false);
              return;
            }
            
            // Trong môi trường development, hiển thị mã OTP từ backend nếu có
            setSuccessMessage(`Mã OTP đã được gửi đến số điện thoại của bạn. Dev mode: Sử dụng mã OTP ${response.otp}`);
          }
        } else {
          // Nếu không nhận được OTP từ backend (có thể số điện thoại không tồn tại)
          setError('Số điện thoại không tồn tại hoặc không thể gửi mã OTP. Vui lòng kiểm tra lại.');
          setIsLoading(false);
          return;
        }
      } catch (err: any) {
        if (err.message.includes('đã được sử dụng')) {
          setIsPhoneUsed(true);
          setError(err.message);
          setIsLoading(false);
          return;
        } else {
          // Các lỗi khác có thể là số điện thoại không tồn tại
          setError('Số điện thoại không tồn tại hoặc không thể kiểm tra. Vui lòng thử lại sau.');
          setIsLoading(false);
          return;
        }
      }
      
      // Nếu đã ở bước OTP và không có backendOTP, cần xử lý việc gửi lại OTP
      if (step === 'otp') {
        // Nếu có RecaptchaVerifier, thử gửi lại OTP
        if (recaptchaVerifierRef.current) {
          try {
            const result = await sendOtpToPhone(formattedPhone, recaptchaVerifierRef.current);
            confirmationResultRef.current = result;
            setSuccessMessage('Mã OTP đã được gửi lại đến số điện thoại của bạn');
            setResendTimer(60);
          } catch (resendErr) {
            console.error('Lỗi khi gửi lại OTP:', resendErr);
            handleOtpError(resendErr);
          }
        } else {
          // Không có verifier, hiển thị reCAPTCHA mới
          try {
            if (window.recaptchaVerifier && typeof window.recaptchaVerifier.clear === 'function') {
              try {
                window.recaptchaVerifier.clear();
              } catch (clearError) {
              }
              window.recaptchaVerifier = null;
            }
            
            // Reset DOM setup for reCAPTCHA
            const container = document.getElementById('inline-recaptcha-container');
            if (container) {
              container.innerHTML = '';
            }
            
            // Show reCAPTCHA
            setTimeout(() => {
              setShowRecaptcha(true);
              setIsLoading(false);
            }, 300);
            return;
          } catch (recaptchaErr) {
            console.error('Lỗi khi chuẩn bị reCAPTCHA mới:', recaptchaErr);
            setError('Không thể tạo mới xác thực reCAPTCHA. Vui lòng tải lại trang.');
            setIsLoading(false);
            return;
          }
        }
        
        setIsLoading(false);
        return;
      }
      
      // Clear any existing reCAPTCHA instances before showing new one
      try {
        if (window.recaptchaVerifier && typeof window.recaptchaVerifier.clear === 'function') {
          try {
            window.recaptchaVerifier.clear();
          } catch (clearError) {
          }
          window.recaptchaVerifier = null;
        }
        
        // Reset DOM setup for reCAPTCHA
        const container = document.getElementById('inline-recaptcha-container');
        if (container) {
          container.innerHTML = '';
        }
      } catch (cleanupError) {
      }
      
      // Wait a bit to ensure cleanup is done before showing
      setTimeout(() => {
        setShowRecaptcha(true);
        setIsLoading(false);
      }, 300); // Increase timeout to ensure proper cleanup
      
    } catch (err: any) {
      console.error('Lỗi tổng thể:', err);
      setError('Đã xảy ra lỗi không mong muốn. Vui lòng thử lại sau.');
      setShowRecaptcha(false);
      setIsLoading(false);
    }
  };

  return (
    <div className="register-container">
      <div className="flex min-h-screen flex-col items-center justify-center bg-blue-100 p-6">
        <div className="w-full max-w-sm rounded-lg bg-white p-8 shadow-lg">
          <div className="flex flex-col items-center">
            <img src="/images/logo.png" alt="Logo" className="h-20 w-20 rounded-full" />
            <h2 className="mt-4 text-2xl font-bold text-gray-900">
              Đăng ký tài khoản SOPHY
            </h2>
            <p className="mt-2 text-sm text-gray-600 text-center">
              Tạo tài khoản SOPHY để kết nối với ứng dụng SOPHY Web
            </p>
          </div>

          {step === 'phone' && (
            <form className="mt-8 space-y-6" onSubmit={handlePhoneSubmit}>
              <div>
                <label htmlFor="phone" className="block text-sm font-medium text-gray-700">
                  Số điện thoại
                </label>
                <PhoneInput
                  international
                  defaultCountry="VN"
                  placeholder="Nhập số điện thoại"
                  value={phone}
                  onChange={value => setPhone(value || '')}
                  className="mt-2 w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none"
                />
                <div className="mt-2 text-xs text-gray-500 space-y-1">
                  <p>Yêu cầu về số điện thoại:</p>
                  <ul className="space-y-1 pl-1">
                    <li className="flex items-start">
                      <span className="mr-2">-</span>
                      <span>Số điện thoại Việt Nam hợp lệ</span>
                    </li>
                    <li className="flex items-start">
                      <span className="mr-2">-</span>
                      <span>Có 9 chữ số sau mã quốc gia +84</span>
                    </li>
                    <li className="flex items-start">
                      <span className="mr-2">-</span>
                      <span>Có 10 chữ số với số 0 đầu tiên (không kể mã quốc gia)</span>
                    </li>
                  </ul>
                </div>
              </div>
              
              {error && (
                <div className="p-2 bg-red-50 border border-red-200 rounded-md">
                  <p className="text-sm text-red-600 text-center">{error}</p>
                </div>
              )}
              
              {successMessage && (
                <div className="p-2 bg-green-50 border border-green-200 rounded-md">
                  <p className="text-sm text-green-600 text-center">{successMessage}</p>
                </div>
              )}
              
              <div className="space-y-4">
                <div 
                  id="inline-recaptcha-container" 
                  className={`transition-all duration-300 ${
                    showRecaptcha ? 'opacity-100 max-h-[90px] mb-4' : 'opacity-0 max-h-0 overflow-hidden pointer-events-none'
                  }`}
                  style={{ 
                    position: 'relative',
                    display: showRecaptcha ? 'block' : 'none',
                    zIndex: 9
                  }}
                >
                  {/* Container for reCAPTCHA widget */}
                </div>
                
                {showRecaptcha && (
                  <RecaptchaContainer 
                    onVerified={handleRecaptchaVerified}
                    containerId="inline-recaptcha-container"
                  />
                )}
                
                <button
                  type="submit"
                  disabled={isLoading || (showRecaptcha && !recaptchaVerified)}
                  className={`w-full rounded-md ${
                    isLoading || (showRecaptcha && !recaptchaVerified) 
                      ? 'bg-gray-400' 
                      : 'bg-blue-500 hover:bg-blue-600'
                  } px-4 py-2 text-sm font-semibold text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all duration-300`}
                >
                  {showRecaptcha 
                    ? 'Vui lòng xác thực bảo mật' 
                    : isLoading 
                      ? 'Đang xử lý...' 
                      : 'Tiếp tục'
                  }
                </button>
              </div>
              
              {isPhoneUsed && (
                <div className="mt-4 text-center">
                  <Link 
                    to={{
                      pathname: "/",
                      search: `?phone=${encodeURIComponent(phone)}`
                    }} 
                    className="text-sm font-semibold text-blue-500 hover:text-blue-400"
                  >
                    Đăng nhập thay vì đăng ký
                  </Link>
                </div>
              )}
            </form>
          )}

          {step === 'otp' && (
            <form className="mt-8 space-y-6" onSubmit={handleOtpSubmit}>
              <div>
                <label htmlFor="otp" className="block text-sm font-medium text-gray-700">
                  Mã xác thực OTP
                </label>
                <input
                  id="otp"
                  name="otp"
                  type="text"
                  required
                  className="mt-2 w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none"
                  placeholder="Nhập mã OTP"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  pattern="^\d{6}$"
                />
                <div className="mt-2 text-xs text-gray-500 space-y-1">
                  <p>Yêu cầu về mã OTP:</p>
                  <ul className="space-y-1 pl-1">
                    <li className="flex items-start">
                      <span className="mr-2">-</span>
                      <span>Mã OTP gồm 6 chữ số</span>
                    </li>
                    <li className="flex items-start">
                      <span className="mr-2">-</span>
                      <span>Mã không bao gồm ký tự</span>
                    </li>
                  </ul>
                </div>
              </div>
              
              {error && (
                <div className="p-2 bg-red-50 border border-red-200 rounded-md">
                  <p className="text-sm text-red-600 text-center">{error}</p>
                </div>
              )}
              
              {successMessage && (
                <div className="p-2 bg-green-50 border border-green-200 rounded-md">
                  <p className="text-sm text-green-600 text-center">{successMessage}</p>
                </div>
              )}
              
              <button
                type="submit"
                className="w-full rounded-md bg-blue-500 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              >
                Xác thực
              </button>
              {resendTimer > 0 ? (
                <p className="mt-4 text-center text-sm text-gray-600">
                  Gửi lại mã sau {resendTimer} giây
                </p>
              ) : (
                <button
                  type="button"
                  onClick={handlePhoneSubmit}
                  className="mt-4 w-full text-center text-sm text-indigo-600 hover:text-indigo-500"
                >
                  Gửi lại mã OTP
                </button>
              )}
            </form>
          )}

          {/* Thêm step mới cho phần nhập tên */}
          {step === 'name' && (
            <form className="mt-8 space-y-6" onSubmit={handleNameSubmit}>
              <div>
                <label htmlFor="fullname" className="block text-sm font-medium text-gray-700">
                  Họ và tên
                </label>
                <input
                  id="fullname"
                  name="fullname"
                  type="text"
                  required
                  className="mt-2 w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none"
                  value={fullname}
                  onChange={(e) => setFullname(e.target.value)}
                  pattern="^[A-Za-zÀ-ỹ]+ [A-Za-zÀ-ỹ]+( [A-Za-zÀ-ỹ]+)*$"
                  title="Họ và tên phải có ít nhất 2 từ (họ và tên) cách nhau bởi dấu cách"
                />
                <div className="mt-2 text-xs text-gray-500 space-y-1">
                  <p>Yêu cầu về Họ và tên:</p>
                  <ul className="space-y-1 pl-1">
                    <li className="flex items-start">
                      <span className="mr-2">-</span>
                      <span>Phải có ít nhất 2 từ (họ và tên)</span>
                    </li>
                    <li className="flex items-start">
                      <span className="mr-2">-</span>
                      <span>Các từ phải cách nhau bởi dấu cách</span>
                    </li>
                    <li className="flex items-start">
                      <span className="mr-2">-</span>
                      <span>Chỉ chứa chữ cái và dấu cách</span>
                    </li>
                    <li className="flex items-start">
                      <span className="mr-2">-</span>
                      <span>Độ dài từ 3-50 ký tự</span>
                    </li>
                  </ul>
                </div>
              </div>
              
              {error && (
                <div className="p-2 bg-red-50 border border-red-200 rounded-md">
                  <p className="text-sm text-red-600 text-center">{error}</p>
                </div>
              )}
              
              <button
                type="submit"
                className="w-full rounded-md bg-blue-500 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              >
                Tiếp tục
              </button>
            </form>
          )}

          {step === 'info' && (
            <form className="mt-8 space-y-6" onSubmit={handleRegister}>
              <div className="space-y-4">
                <div>
                  <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                    Mật khẩu
                  </label>
                  <input
                    id="password"
                    name="password"
                    type="password"
                    required
                    className="mt-2 w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    pattern="^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d]{6,20}$"
                    title="Mật khẩu phải từ 6-20 ký tự, bao gồm chữ và số"
                  />
                </div>
                <div className="mt-2 text-xs text-gray-500 space-y-1">
                  <p>Yêu cầu về mật khẩu:</p>
                  <ul className="space-y-1 pl-1">
                    <li className="flex items-start">
                      <span className="mr-2">-</span>
                      <span>Mật khẩu phải từ 6-20 ký tự</span>
                    </li>
                    <li className="flex items-start">
                      <span className="mr-2">-</span>
                      <span>Phải chứa ít nhất 1 chữ cái</span>
                    </li>
                    <li className="flex items-start">
                      <span className="mr-2">-</span>
                      <span>Phải chứa ít nhất 1 chữ số</span>
                    </li>
                  </ul>
                </div>

                <div>
                  <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">
                    Xác nhận mật khẩu
                  </label>
                  <input
                    id="confirmPassword"
                    name="confirmPassword"
                    type="password"
                    required
                    className="mt-2 w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Giới tính</label>
                  <div className="mt-2 space-x-4">
                    <label className="inline-flex items-center">
                      <input
                        type="radio"
                        name="gender"
                        checked={isMale}
                        onChange={() => setIsMale(true)}
                        className="form-radio h-4 w-4 text-indigo-600"
                      />
                      <span className="ml-2">Nam</span>
                    </label>
                    <label className="inline-flex items-center">
                      <input
                        type="radio"
                        name="gender"
                        checked={!isMale}
                        onChange={() => setIsMale(false)}
                        className="form-radio h-4 w-4 text-indigo-600"
                      />
                      <span className="ml-2">Nữ</span>
                    </label>
                  </div>
                </div>

                <div>
                  <label htmlFor="birthday" className="block text-sm font-medium text-gray-700">
                    Ngày sinh
                  </label>
                  <input
                    id="birthday"
                    name="birthday"
                    type="date"
                    className="mt-2 w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none"
                    value={birthday}
                    onChange={(e) => setBirthday(e.target.value)}
                  />
                </div>
                <div className="mt-2 text-xs text-gray-500 space-y-1">
                  <p>Yêu cầu về Ngày sinh:</p>
                  <ul className="space-y-1 pl-1">
                    <li className="flex items-start">
                      <span className="mr-2">-</span>
                      <span>Phải đủ 13 tuổi</span>
                    </li>
                    <li className="flex items-start">
                      <span className="mr-2">-</span>
                      <span>Ngày tháng năm không được sau ngày hiện tại</span>
                    </li>
                  </ul>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Ảnh đại diện
                  </label>
                  <div className="mt-1 flex items-center space-x-4">
                    {avatarPreview && (
                      <img
                        src={avatarPreview}
                        alt="Avatar preview"
                        className="h-12 w-12 rounded-full object-cover"
                      />
                    )}
                    <input
                      aria-label="Choose avatar image"
                      title="Choose an image for your avatar"
                      placeholder="Select an image file"
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          setAvatarFile(file);
                          setAvatarPreview(URL.createObjectURL(file));
                        }
                      }}
                      className="block w-full text-sm text-gray-500
                        file:mr-4 file:py-2 file:px-4
                        file:rounded-full file:border-0
                        file:text-sm file:font-semibold
                        file:bg-indigo-50 file:text-indigo-700
                        hover:file:bg-indigo-100"
                    />
                  </div>
                </div>
              </div>

              {error && (
                <div className="p-2 bg-red-50 border border-red-200 rounded-md">
                  <p className="text-sm text-red-600 text-center">{error}</p>
                </div>
              )}
              
              {successMessage && (
                <div className="p-2 bg-green-50 border border-green-200 rounded-md">
                  <p className="text-sm text-green-600 text-center">{successMessage}</p>
                </div>
              )}

              <button
                type="submit"
                disabled={isLoading}
                className={`w-full rounded-md ${isLoading ? 'bg-gray-400' : 'bg-blue-500 hover:bg-blue-600'} px-4 py-2 text-sm font-semibold text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2`}
              >
                {isLoading ? 'Đang xử lý...' : 'Đăng ký'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default Register;