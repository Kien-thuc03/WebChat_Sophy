import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { checkUsedPhone, verifyPhoneOTP, registerWithAvatar } from '../../api/API';
import { useAuth } from '../../features/auth/hooks/useAuth';
import PhoneInput from "react-phone-number-input";

const Register: React.FC = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [step, setStep] = useState<'phone' | 'otp' | 'info'>('phone');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [otpId, setOtpId] = useState('');
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

  const handlePhoneSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const result = await checkUsedPhone(phone);
      setOtpId(result.otpId);
      setStep('otp');
      setError('');
      setResendTimer(60);
      setIsPhoneUsed(false);
    } catch (err: any) {
      if (err.message.includes('đã được sử dụng')) {
        setIsPhoneUsed(true);
      }
      setError(err.message);
    }
  };

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
    if (step === 'otp' && 'OTPCredential' in window) {
      const ac = new AbortController();
      navigator.credentials.get({
        otp: { transport: ['sms'] },
        signal: ac.signal
      } as any).then(otp => {
        if (otp && typeof otp === 'object' && 'code' in otp) {
          setOtp(String(otp.code));
        }
      }).catch(() => {});
      return () => ac.abort();
    }
  }, [step]);

  const handleOtpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await verifyPhoneOTP(phone, otp, otpId);
      setStep('info');
      setError('');
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMessage('');
    setIsLoading(true);
    
    try {
      if (password !== confirmPassword) {
        setError('Mật khẩu xác nhận không khớp');
        setIsLoading(false);
        return;
      }

      // Kiểm tra tên chỉ chứa chữ cái và dấu cách
      const nameRegex = /^[A-Za-zÀ-ỹ\s]+$/;
      if (!nameRegex.test(fullname)) {
        setError('Họ và tên chỉ được chứa chữ cái và dấu cách');
        setIsLoading(false);
        return;
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
        phone, 
        password, 
        fullname, 
        isMale, 
        birthday,
        avatarFile
      );
      
      console.log('Đăng ký thành công:', result);
      
      // Hiển thị thông báo thành công
      setSuccessMessage('Đăng ký thành công! Đang đăng nhập...');
      
      try {
        // Tự động đăng nhập sau khi đăng ký thành công
        await login({
          phone: phone,
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

  return (
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

        {error && (
          <div className="text-sm text-red-500 text-center">{error}</div>
        )}

        {successMessage && (
          <div className="text-sm text-green-500 text-center">{successMessage}</div>
        )}

        {step === 'phone' && (
          <form className="mt-8 space-y-6" onSubmit={handlePhoneSubmit}>
            <div>
              <label htmlFor="phone" className="block text-sm font-medium text-gray-700">
                Số điện thoại
              </label>
              <input
                id="phone"
                name="phone"
                type="tel"
                required
                className="mt-2 w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none"
                placeholder="Nhập số điện thoại"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                pattern="^0\d{9}$"
              />
            </div>
            <button
              type="submit"
              className="w-full rounded-md bg-blue-500 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              Tiếp tục
            </button>
            {isPhoneUsed && (
              <div className="mt-4 text-center">
                <Link to="/login" className="text-sm font-semibold text-blue-500 hover:text-blue-400">
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
            </div>
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

        {step === 'info' && (
          <form className="mt-8 space-y-6" onSubmit={handleRegister}>
            <div className="space-y-4">
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
                  pattern="^[A-Za-zÀ-ỹ\s]+$"
                  title="Họ và tên chỉ được chứa chữ cái và dấu cách"
                />
              </div>

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
                  pattern="^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d]{6,}$"
                  title="Mật khẩu phải có ít nhất 6 ký tự, bao gồm chữ và số"
                />
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
                <p className="mt-1 text-xs text-gray-500">
                  Bạn phải đủ 13 tuổi để đăng ký tài khoản
                </p>
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
  );
};

export default Register;