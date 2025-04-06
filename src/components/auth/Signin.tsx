import React, { useState } from "react";
import { useAuth } from "../../features/auth/hooks/useAuth";
import { Link, useNavigate } from "react-router-dom";
import "react-phone-number-input/style.css";
import PhoneInput from "react-phone-number-input";
// import { generateQRToken, verifyQRToken } from "../../api/API";

const Signin: React.FC = () => {
  const { login } = useAuth();
  const [formData, setFormData] = useState({ phone: "", password: "" });
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handlePhoneChange = (value?: string) => {
    setFormData((prev) => ({ ...prev, phone: value || "" }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(""); // Clear previous errors

    try {
      if (!formData.phone || !formData.password) {
        setError("Vui lòng nhập đầy đủ thông tin");
        return;
      }

      // Format phone number
      const formattedData = {
        phone: formData.phone.startsWith("+84")
          ? "0" + formData.phone.slice(3)
          : formData.phone,
        password: formData.password,
      };

      console.log("Formatted phone:", formattedData.phone);
      console.log("Password:", formattedData.password);

      // Attempt login
      await login(formattedData);

      // Navigate to main page on success
      navigate("/main");
    } catch (error: unknown) {
      // Narrow the error type
      if (error instanceof Error) {
        if (error.message === "Tài khoản không tồn tại") {
          setError("Tài khoản không tồn tại");
        } else if (error.message === "Sai mật khẩu") {
          setError("Sai mật khẩu");
        } else {
          setError(error.message || "Đăng nhập thất bại, vui lòng thử lại");
        }
      } else {
        setError("Đăng nhập thất bại, vui lòng thử lại");
      }

      // Log error for debugging
      console.error("Login error:", error);
    }
  };
  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { value } = e.target;
    setFormData((prev) => ({ ...prev, password: value }));
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-blue-100 p-6">
      <div className="w-full max-w-sm rounded-lg bg-white p-8 shadow-lg">
        <div className="flex flex-col items-center">
          <img
            src="/images/logo.png"
            alt="Logo"
            className="h-20 w-20 rounded-full"
          />
          <h2 className="mt-4 text-2xl font-bold text-gray-900">
            Đăng nhập với mật khẩu
          </h2>
        </div>

        <form onSubmit={handleSubmit} className="mt-6 space-y-6">
          <div>
            <label
              htmlFor="phone"
              className="block text-sm font-medium text-gray-900">
              Số điện thoại
            </label>
            <PhoneInput
              international
              defaultCountry="VN"
              placeholder="Nhập số điện thoại"
              value={formData.phone}
              onChange={handlePhoneChange}
              className="mt-2 w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none"
              autoComplete="tel" // Thêm autocomplete cho số điện thoại
            />
          </div>

          <div>
            <div className="flex items-center justify-between">
              <label
                htmlFor="password"
                className="block text-sm font-medium text-gray-900">
                Mật khẩu
              </label>
              <Link
                to="/forgot-password"
                className="text-sm font-semibold text-blue-500 hover:text-blue-400">
                Quên mật khẩu?
              </Link>
            </div>
            <input
              id="password"
              name="password"
              type="password"
              required
              value={formData.password}
              onChange={handlePasswordChange}
              className="mt-2 w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none"
              autoComplete="current-password" // Thêm autocomplete cho mật khẩu
            />
          </div>

          {error && (
            <div className="text-sm text-red-500 text-center">{error}</div>
          )}

          <button
            type="submit"
            className="w-full rounded-md bg-blue-500 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2">
            Đăng nhập
          </button>
          
          <div className="mt-15">
            <Link
              to="/register"
              className="text-sm font-semibold text-blue-500 hover:text-blue-400">
              Đăng ký
            </Link>
            <Link
              to="/qr-signin"
              className="text-sm font-semibold text-blue-500 hover:text-blue-400">
              Đăng nhập bằng mã QR
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Signin;
