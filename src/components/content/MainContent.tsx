import React, { useState } from "react";
import { LeftOutlined, RightOutlined } from "@ant-design/icons";
import darkModeImg from "../../assets/imgs/inapp-welcome-screen-06-darkmode.png";
import zbizImg from "../../assets/imgs/zbiz_onboard_vi_3x.png";
import quickMsgImg from "../../assets/imgs/quick-message-onboard.png";
import seamlessImg from "../../assets/imgs/inapp-welcome-screen-04.png";
import fileTransferImg from "../../assets/imgs/inapp-welcome-screen-03.png";

const slides = [
  {
    imgSrc: darkModeImg,
    title: "Giao diện Dark Mode",
    description: "Thư giãn và bảo vệ mắt với chế độ tối mới trên Zalo PC",
    buttonText: "Thử ngay",
  },
  {
    imgSrc: zbizImg,
    title: "Kinh doanh hiệu quả với zBusiness Pro",
    description:
      "Bán hàng chuyên nghiệp với Nhãn Business và Bộ công cụ kinh doanh",
    buttonText: "Tìm hiểu thêm",
  },
  {
    imgSrc: quickMsgImg,
    title: "Nhắn tin nhiều hơn, soạn thảo ít hơn",
    description: "Lưu sẵn các tin nhắn thường dùng để gửi nhanh",
  },
  {
    imgSrc: seamlessImg,
    title: "Trải nghiệm xuyên suốt",
    description: "Kết nối và làm việc trên mọi thiết bị với dữ liệu đồng bộ",
  },
  {
    imgSrc: fileTransferImg,
    title: "Gửi File nặng?",
    description: 'Đã có Zalo PC "xử" hết',
  },
];

const MainContent: React.FC = () => {
  const [currentSlide, setCurrentSlide] = useState(0);

  const handleNext = () => {
    setCurrentSlide((prev) => (prev + 1) % slides.length);
  };

  const handlePrev = () => {
    setCurrentSlide((prev) => (prev - 1 + slides.length) % slides.length);
  };

  return (
    <div className="flex-1 w-full flex flex-col items-center justify-center">
      <div className="text-center mb-4">
        <h1 className="text-2xl font-bold">Chào mừng đến với Sophy PC!</h1>
        <p className="text-gray-600">
          Khám phá những tiện ích hỗ trợ làm việc và trò chuyện cùng người thân,
          bạn bè được tối ưu hoá cho máy tính của bạn.
        </p>
      </div>

      <div className="relative flex items-center justify-center w-full max-w-lg">
        <button
          type="button"
          className="absolute left-0 p-2 rounded-full cursor-pointer text-blue-500  transition"
          onClick={handlePrev}
          title="Previous Slide"
        >
          <LeftOutlined />
        </button>

        <div className="flex flex-col items-center text-center">
          <img
            src={slides[currentSlide].imgSrc}
            alt={slides[currentSlide].title}
            className="w-80 h-auto"
          />
          <h2 className="text-xl font-semibold mt-4">
            {slides[currentSlide].title}
          </h2>
          <p className="text-gray-600 mt-2">
            {slides[currentSlide].description}
          </p>
          {slides[currentSlide].buttonText && (
            <button className="mt-4 bg-blue-500 text-white py-2 px-4 rounded">
              {slides[currentSlide].buttonText}
            </button>
          )}
        </div>

        <button
          type="button"
          className="absolute right-0 p-2 rounded-full text-blue-500 cursor-pointer transition"
          onClick={handleNext}
          title="Next Slide"
        >
          <RightOutlined />
        </button>
      </div>

      <div className="mt-4 flex space-x-2">
        {slides.map((_, index) => (
          <span
            key={index}
            className={`w-3 h-3 rounded-full cursor-pointer transition ${
              currentSlide === index ? "bg-blue-500" : "bg-gray-300"
            }`}
            onClick={() => setCurrentSlide(index)} // Chuyển đến slide được nhấn
          ></span>
        ))}
      </div>
    </div>
  );
};

export default MainContent;
