import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { checkUsedPhone, verifyPhoneOTP, registerWithAvatar } from '../../api/API';
import { useAuth } from '../../features/auth/hooks/useAuth';
import PhoneInput from "react-phone-number-input";
import "react-phone-number-input/style.css";

const Register: React.FC = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [step, setStep] = useState<'phone' | 'otp' | 'name' | 'info'>('phone');
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
    setError('');
    try {
      // Đảm bảo số điện thoại đúng định dạng (bắt đầu bằng 0 ở Việt Nam)
      let formattedPhone = phone;
      
      // Kiểm tra định dạng số điện thoại
      if (!phone || (typeof phone !== 'string')) {
        setError('Vui lòng nhập số điện thoại hợp lệ');
        return;
      }
      
      // Kiểm tra xem số điện thoại có định dạng quốc tế (+84) không
      if (phone.startsWith("+84")) {
        // Đảm bảo có 9 số sau mã quốc gia +84
        if (phone.length !== 12) {
          setError('Định dạng số điện thoại không hợp lệ.');
          return;
        }
        formattedPhone = "0" + phone.slice(3);
      } else if (!phone.startsWith("0")) {
        setError('Định dạng số điện thoại không hợp lệ.');
        return;
      }
      
      console.log("Gửi yêu cầu kiểm tra số điện thoại:", formattedPhone);
      const result = await checkUsedPhone(formattedPhone);
      console.log("Kết quả kiểm tra số điện thoại:", result);
      
      if (!result || !result.otpId) {
        setError('Không nhận được mã OTP. Vui lòng thử lại.');
        return;
      }
      
      setOtpId(result.otpId);
      setStep('otp');
      setError('');
      setResendTimer(60);
      setIsPhoneUsed(false);
    } catch (err: any) {
      console.error('Lỗi kiểm tra số điện thoại:', err);
      
      // Chuyển thông báo lỗi sang tiếng Việt
      if (err.message && err.message.includes('Invalid phone number format')) {
        setError('Định dạng số điện thoại không hợp lệ. Vui lòng kiểm tra lại.');
      } else if (err.message.includes('đã được sử dụng')) {
        setIsPhoneUsed(true);
        setError(err.message);
      } else {
        setError(err.message || 'Đã xảy ra lỗi. Vui lòng thử lại sau.');
      }
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
    setError('');
    try {
      // Đảm bảo định dạng số điện thoại đúng trước khi gửi đến API
      let formattedPhone = phone;
      if (phone.startsWith("+84")) {
        formattedPhone = "0" + phone.slice(3);
      }

      console.log("Xác thực OTP với thông tin:", {
        phone: formattedPhone,
        otp,
        otpId
      });

      await verifyPhoneOTP(formattedPhone, otp, otpId);
      setStep('name'); // Chuyển sang step nhập tên thay vì info
      setError('');
    } catch (err: any) {
      console.error("Lỗi xác thực OTP:", err);
      // Xử lý các loại lỗi xác thực OTP
      if (err.message.includes("Yêu cầu xác thực không hợp lệ")) {
        setError("Yêu cầu xác thực không hợp lệ. Vui lòng gửi lại mã mới.");
        setResendTimer(0);
      } else if (err.message.includes("Mã OTP không chính xác")) {
        setError("Mã OTP không chính xác. Vui lòng kiểm tra và thử lại.");
      } else if (err.message.includes("Mã OTP đã hết hạn")) {
        setError("Mã OTP đã hết hạn. Vui lòng gửi lại mã mới.");
        setResendTimer(0);
      } else if (err.message.includes("Quá nhiều lần xác thực")) {
        setError("Quá nhiều lần xác thực thất bại. Vui lòng thử lại sau một lúc.");
      } else {
        setError(err.message || "Xác thực OTP thất bại. Vui lòng thử lại.");
      }
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
    
    // Nếu tên hợp lệ, chuyển sang bước tiếp theo
    setStep('info');
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
      
      console.log('Đăng ký thành công:', result);
      
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
            
            <button
              type="submit"
              className="w-full rounded-md bg-blue-500 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              Tiếp tục
            </button>
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
  );
};

export default Register;