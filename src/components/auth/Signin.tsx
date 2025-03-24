import React, { useState } from "react";
import { useAuth } from "../../features/auth/hooks/useAuth";
import { Link, useNavigate } from "react-router-dom";
import "react-phone-number-input/style.css";
import PhoneInput from "react-phone-number-input";

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

      const formattedData = {
        phone: formData.phone.startsWith("+84")
          ? "0" + formData.phone.slice(3)
          : formData.phone,
        password: formData.password,
      };

      console.log("Attempting login with:", formattedData);
      await login(formattedData);
      navigate("/main");
    } catch (error: any) {
      // Handle specific error messages from API
      if (error.message === "User not found") {
        setError("Tài khoản không tồn tại");
      } else if (error.message === "Invalid password") {
        setError("Sai mật khẩu");
      } else {
        setError(error.message || "Đăng nhập thất bại, vui lòng thử lại");
      }
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
            src="/images/logo.jpg"
            alt="Logo"
            className="h-20 w-20 rounded-full"
          />
          <h2 className="mt-4 text-2xl font-bold text-gray-900">
            Đăng nhập với mật khẩu
          </h2>

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
              <a
                href="#"
                className="text-sm font-semibold text-blue-500 hover:text-blue-400">
                <Link to="/forgot-password">Quên mật khẩu?</Link>
              </a>
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
        </form>
      </div>
    </div>
  );
};

export default Signin;
