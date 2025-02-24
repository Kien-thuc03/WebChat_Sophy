import React from "react";
import Sidebar from "../components/sidebar/Sidebar";
import ChatList from "../components/chat/ChatList";
import MainContent from "../components/content/MainContent";

const Dashboard: React.FC = () => {
  return (
    <div className="flex h-screen">
      <Sidebar />
      <ChatList />
      <MainContent />
    </div>
  );
};

export default Dashboard;