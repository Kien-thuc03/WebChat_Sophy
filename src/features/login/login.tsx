export const Signin = () => {
  return (
    <div className="flex min-h-full flex-1 flex-col justify-center px-6 py-12 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-sm">
        <img
          alt="logo"
          src="/images/logo.jpg"
          className="mx-auto h-50 w-auto rounded-full"
        />
        <h2 className="mt-10 text-center text-2xl/9 font-bold tracking-tight text-gray-900">
          Đăng nhập với mật khẩu
        </h2>
      </div>
      <div className="mt-10 sm:mx-auto sm:w-full sm:max-w-sm">
        <form action="#" method="POST" className="space-y-6">
        <div>
    <label htmlFor="phone" className="block text-sm font-medium text-gray-900">
        Số điện thoại
    </label>
        <div className="mt-2 flex">
            <label id="country-code-label" className="sr-only">Country Code</label>
            <select aria-labelledby="country-code-label" className="rounded-l-md bg-white px-3 py-1.5 text-base text-gray-900 outline-1 outline-gray-300 sm:text-sm" defaultValue="+84">
                <option value="+84">+84</option>
                <option value="+1">+1</option>
                <option value="+44">+44</option>
            </select>
            <input
                id="phone"
                name="phone"
                type="text"
                required
                placeholder="Nhập số điện thoại"
                className="block w-full rounded-r-md bg-white px-3 py-1.5 text-base text-gray-900 outline-1 outline-gray-300 placeholder:text-gray-400 focus:outline-2 focus:outline-blue-500 sm:text-sm"
            />
        </div>
    </div>

          <div>
            <div className="flex items-center justify-between">
              <label
                htmlFor="password"
                className="block text-sm font-medium text-gray-900"
              >
                Mật khẩu
              </label>
              <div className="text-sm">
                <a
                  href="#"
                  className="font-semibold text-blue-500 hover:text-blue-400"
                >
                  Quên mật khẩu?
                </a>
              </div>
            </div>
            <div className="mt-2">
              <input
                id="password"
                name="password"
                type="password"
                required
                autoComplete="current-password"
                className="block w-full rounded-md bg-white px-3 py-1.5 text-base text-gray-900 outline-1 outline-gray-300 placeholder:text-gray-400 focus:outline-2 focus:outline-blue-500 sm:text-sm"
              />
            </div>
          </div>

          <div>
            <button
              type="submit"
              className="flex w-full justify-center rounded-md bg-blue-500 px-3 py-1.5 text-sm font-semibold text-white shadow-xs hover:bg-blue-600 focus-visible:outline-2 focus-visible:outline-blue-500"
            >
              Đăng nhập
            </button>
          </div>
        </form>

        <p className="mt-10 text-center text-sm text-gray-500">
          Chưa có tài khoản?{" "}
          <a
            href="#"
            className="font-semibold text-blue-500 hover:text-blue-400"
          >
            Bắt đầu dùng thử miễn phí 14 ngày
          </a>
        </p>
      </div>
    </div>
  );
};
export default Signin;
