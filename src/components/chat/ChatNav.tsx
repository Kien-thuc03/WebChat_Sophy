import React, { useState, useRef, useEffect, useCallback } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faChevronDown, faEllipsisH, faTag } from "@fortawesome/free-solid-svg-icons";
//thay the khi BE them thong tin
type TabType = "all" | "unread" | "label";
//thay the khi BE them thong tin
interface Label {
  id: string;
  name: string;
  color: string;
  selected: boolean;
}

const ChatNav: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabType>("all");
  const [isLabelMenuOpen, setIsLabelMenuOpen] = useState(false);
  const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);
  //thay the khi BE them thong tin
  const [labels, setLabels] = useState<Label[]>([
    { id: "customer", name: "Khách hàng", color: "rgb(217, 27, 27)", selected: false },
    { id: "family", name: "Gia đình", color: "rgb(75, 195, 119)", selected: false },
    { id: "work", name: "Công việc", color: "rgb(255, 105, 5)", selected: false },
    { id: "friends", name: "Bạn bè", color: "rgb(111, 63, 207)", selected: false },
    { id: "reply_later", name: "Trả lời sau", color: "rgb(250, 192, 0)", selected: false },
    { id: "stranger", name: "Tin nhắn từ người lạ", color: "#666", selected: false },
  ]);
  
  const tabsRef = useRef<Record<TabType, HTMLDivElement | null>>({
    all: null,
    unread: null,
    label: null
  });
  const labelMenuRef = useRef<HTMLDivElement | null>(null);
  const labelButtonRef = useRef<HTMLDivElement | null>(null);
  const moreMenuRef = useRef<HTMLDivElement | null>(null);
  const moreButtonRef = useRef<HTMLDivElement | null>(null);
  const [indicatorStyle, setIndicatorStyle] = useState({
    width: 0,
    left: 0,
  });

  // Xử lý click bên ngoài để đóng menu phân loại
  const handleClickOutside = useCallback((event: MouseEvent) => {
    if (
      labelMenuRef.current &&
      !labelMenuRef.current.contains(event.target as Node) &&
      labelButtonRef.current &&
      !labelButtonRef.current.contains(event.target as Node) &&
      isLabelMenuOpen
    ) {
      setIsLabelMenuOpen(false);
    }

    if (
      moreMenuRef.current &&
      !moreMenuRef.current.contains(event.target as Node) &&
      moreButtonRef.current &&
      !moreButtonRef.current.contains(event.target as Node) &&
      isMoreMenuOpen
    ) {
      setIsMoreMenuOpen(false);
    }
  }, [isLabelMenuOpen, isMoreMenuOpen]);

  useEffect(() => {
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [handleClickOutside]);

  // Cập nhật vị trí của thanh indicator khi tab thay đổi
  useEffect(() => {
    const activeTabElement = tabsRef.current[activeTab];
    if (activeTabElement) {
      setIndicatorStyle({
        width: activeTabElement.offsetWidth,
        left: activeTabElement.offsetLeft,
      });
    }
  }, [activeTab]);

  const handleTabClick = (tab: TabType) => {
    setActiveTab(tab);
  };

  const toggleLabelMenu = () => {
    setIsLabelMenuOpen(!isLabelMenuOpen);
    if (isMoreMenuOpen) setIsMoreMenuOpen(false);
  };

  const toggleMoreMenu = () => {
    setIsMoreMenuOpen(!isMoreMenuOpen);
    if (isLabelMenuOpen) setIsLabelMenuOpen(false);
  };

  const handleLabelSelect = (labelId: string) => {
    setLabels(labels.map(label => 
      label.id === labelId ? { ...label, selected: !label.selected } : label
    ));
  };

  const handleManageLabels = () => {
    console.log("Quản lý thẻ phân loại");
    setIsLabelMenuOpen(false);
  };

  const handleMarkAsRead = () => {
    console.log("Đánh dấu đã đọc");
    setIsMoreMenuOpen(false);
  };

  return (
    <div className="chat-list w-80 ">
      {/* Navigation buttons */}
      <div className="flex items-center justify-between border-b relative px-4">
        {/* Left side - Tất cả & Chưa đọc */}
        <div className="flex">
          <div
            ref={(el) => (tabsRef.current.all = el)}
            className={`px-2 py-2 cursor-pointer ${activeTab === "all" ? "selected" : ""}`}
            onClick={() => handleTabClick("all")}
          >
            <div className={`${activeTab === "all" ? "text-blue-500 font-semibold" : "text-gray-500"} text-sm`}>
              Tất cả
            </div>
          </div>
          
          <div
            ref={(el) => (tabsRef.current.unread = el)}
            className={`px-2 py-2 cursor-pointer ${activeTab === "unread" ? "selected" : ""}`}
            onClick={() => handleTabClick("unread")}
          >
            <div className={`${activeTab === "unread" ? "text-blue-500 font-semibold" : "text-gray-500"} text-sm`}>
              Chưa đọc
            </div>
          </div>
        </div>
        
        {/* Right side - Phân loại & More */}
        <div className="flex items-center">
          <div
            ref={labelButtonRef}
            className={`px-2 py-2 cursor-pointer flex items-center relative text-sm ${isLabelMenuOpen ? 'bg-blue-100 rounded-full' : ''}`}
            onClick={toggleLabelMenu}
          >
            <div className={`${isLabelMenuOpen ? 'text-blue-500 font-semibold' : 'text-gray-500'} mr-1`}>
              Phân loại
            </div>
            <FontAwesomeIcon icon={faChevronDown} className={`text-xs ${isLabelMenuOpen ? 'text-blue-500' : 'text-gray-500'}`} />
            
            {/* Dropdown menu phân loại */}
            {isLabelMenuOpen && (
              <div 
                ref={labelMenuRef}
                className="absolute top-full left-0 mt-2 bg-white rounded-lg shadow-[0_0_15px_rgba(0,0,0,0.2)] z-20 w-64 opacity-100"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="p-3">
                  <div className="max-h-[400px] overflow-y-auto">
                    <div>
                      <div className="px-1 py-2 font-bold text-gray-600">
                        <span>Theo thẻ phân loại</span>
                      </div>
                      
                      {labels.map((label) => (
                        <div 
                          key={label.id} 
                          className="flex items-center p-2 hover:bg-gray-100 rounded cursor-pointer my-1" 
                          onClick={() => handleLabelSelect(label.id)}
                        >
                          <div className="mr-3">
                            <div className="flex items-center justify-center">
                              <svg width="24" height="24" viewBox="0 0 25 25" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <rect 
                                  x="5.25" 
                                  y="5.25" 
                                  width="14.5" 
                                  height="14.5" 
                                  rx="2.25" 
                                  fill={label.selected ? label.color : "white"} 
                                  stroke="#ccc" 
                                  strokeWidth="1.5"
                                />
                                {label.selected && (
                                  <path 
                                    d="M9 12.5L11.5 15L16 10" 
                                    stroke="white" 
                                    strokeWidth="2" 
                                    strokeLinecap="round" 
                                    strokeLinejoin="round"
                                  />
                                )}
                              </svg>
                            </div>
                          </div>
                          <div className="mr-2" style={{ color: label.color }}>
                            <FontAwesomeIcon icon={faTag} />
                          </div>
                          <div className="truncate flex-1 text-gray-700">{label.name}</div>
                        </div>
                      ))}
                      
                      <div className={`p-2 rounded-full hover:bg-gray-200 cursor-pointer relative text-sm ${isMoreMenuOpen ? 'text-blue-500 bg-blue-100' : 'text-gray-500 hover:bg-gray-100'}`}></div>
                      <div className={`p-2 text-center rounded-full cursor-pointer my-1 ${labels.some(l => l.selected) ? 'bg-blue-100 text-blue-600 font-medium rounded-full' : 'text-blue-500 hover:bg-gray-100'}`} onClick={handleManageLabels}>
                        <span>Quản lý thẻ phân loại</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
          
          <div 
            ref={moreButtonRef}
            className={`p-2 rounded-full cursor-pointer relative text-sm ${isMoreMenuOpen ? 'bg-blue-100' : 'hover:bg-gray-200'}`}
            onClick={toggleMoreMenu}
          >
            <FontAwesomeIcon icon={faEllipsisH} className={`${isMoreMenuOpen ? 'text-blue-500 font-semibold' : 'text-gray-500'}`} />
            
            {/* Dropdown menu More */}
            {isMoreMenuOpen && (
              <div 
                ref={moreMenuRef}
                className="absolute top-full left-0 mt-2 bg-white rounded-lg shadow-[0_0_15px_rgba(0,0,0,0.2)] z-20 w-auto min-w-[150px] opacity-100"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="p-1">
                  <div className="zmenu-item md" data-active-id="">
                    <div 
                      className="truncate p-2 hover:bg-gray-100 rounded cursor-pointer whitespace-nowrap text-center"
                      onClick={handleMarkAsRead}
                    >
                      <span>Đánh dấu đã đọc</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
        
        {/* Tab indicator - thanh gạch chân hiển thị tab đang được chọn */}
        <div 
          className="tab-indicator absolute h-0.5 bg-blue-500 bottom-0 transition-all duration-300 ease-in-out"
          style={{ width: `${indicatorStyle.width}px`, left: `${indicatorStyle.left}px` }}
        ></div>
      </div>
    </div>
  );
};

export default ChatNav;
