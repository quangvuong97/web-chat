import { useState, useEffect } from "react";
import axios from "axios";
import InfiniteScroll from "react-infinite-scroll-component";
import { Socket } from "socket.io-client";
import { User } from "../auth/auth";
import CreateChatPopup from "../createChatPopup/createChatPopup";

interface GroupChat {
  id: string;
  name: string;
  type: string;
  lastMessage?: string;
  lastMessageTime?: string;
}

interface Message {
  id: string;
  content: string;
  userId: string;
  username: string;
  createdAt: string;
  isRead: boolean;
}

interface ChatScreenProps {
  user: User;
  onLogout: () => void;
  generateAvatar: (username: string) => string;
  socket: Socket | null;
}

function ChatScreen({
  user,
  onLogout,
  generateAvatar,
  socket,
}: ChatScreenProps) {
  const [groupChats, setGroupChats] = useState<GroupChat[]>([]);
  const [selectedGroupChat, setSelectedGroupChat] = useState<GroupChat | null>(
    null
  );
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState<string>("");
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [isPopupOpen, setIsPopupOpen] = useState(false);

  // Load danh sách group chat
  const fetchGroupChats = async (pageNum: number) => {
    try {
      const response = await axios.get(
        "http://ec2-13-239-36-171.ap-southeast-2.compute.amazonaws.com:3000/v1/group-chats/me",
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
          },
          params: { page: pageNum, size: 20 },
        }
      );
      const newGroupChats = response.data.data;

      if (pageNum === 1) {
        setGroupChats(newGroupChats);
      } else {
        // Chỉ thêm các group chat chưa tồn tại trong mảng hiện tại
        setGroupChats((prev) => {
          const existingIds = new Set(prev.map((chat) => chat.id));
          const filteredNewChats = newGroupChats.filter(
            (chat: GroupChat) => !existingIds.has(chat.id)
          );
          return [...prev, ...filteredNewChats];
        });
      }

      setHasMore(newGroupChats.length === 20);
    } catch (error) {
      console.error("Failed to fetch group chats:", error);
    }
  };

  // Load tin nhắn của group chat
  const fetchMessages = async (groupId: string) => {
    try {
      const response = await axios.get(
        `http://ec2-13-239-36-171.ap-southeast-2.compute.amazonaws.com:3000/v1/group-chats/${groupId}/messages`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
          },
          params: { size: 20, page: 1 },
        }
      );
      setMessages(response.data.data.reverse());
    } catch (error) {
      console.error("Failed to fetch messages:", error);
    }
  };

  // Gửi tin nhắn
  const handleSendMessage = async () => {
    if (newMessage.trim() && selectedGroupChat) {
      try {
        await axios.post(
          `http://ec2-13-239-36-171.ap-southeast-2.compute.amazonaws.com:3000/v1/group-chats/${selectedGroupChat.id}/messages`,
          { content: newMessage, socketId: socket?.id },
          {
            headers: {
              Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
            },
          }
        );
        setMessages((prev) => [
          ...prev,
          {
            id: Date.now().toString(),
            content: newMessage,
            userId: user.userId,
            username: user.username,
            createdAt: new Date().toISOString(),
            isRead: false,
          },
        ]);
        setNewMessage("");
      } catch (error) {
        console.error("Failed to send message:", error);
      }
    }
  };

  // Xử lý tạo group chat hoặc nhắn tin cá nhân
  const handleCreateChat = (groupChat: GroupChat) => {
    setGroupChats((prev) => {
      // Kiểm tra xem group chat đã tồn tại chưa
      const existingChatIndex = prev.findIndex(
        (chat) => chat.id === groupChat.id
      );
      if (existingChatIndex !== -1) {
        // Nếu tồn tại, di chuyển lên đầu
        const updatedChats = [...prev];
        const [existingChat] = updatedChats.splice(existingChatIndex, 1);
        return [existingChat, ...updatedChats];
      }
      // Nếu không tồn tại, thêm mới vào đầu
      return [groupChat, ...prev];
    });
    setSelectedGroupChat(groupChat);
    fetchMessages(groupChat.id);
    setIsPopupOpen(false);
  };

  // Xử lý join/leave group chat
  useEffect(() => {
    if (socket && selectedGroupChat) {
      // Gửi leave_group cho group chat hiện tại (nếu có)
      if (selectedGroupChat) {
        socket.emit("leave_group", { groupId: selectedGroupChat.id });
        console.log(`Left group ${selectedGroupChat.id}`);
      }

      // Gửi join_group cho group chat mới
      socket.emit("join_group", { groupId: selectedGroupChat.id });
      console.log(`Joined group ${selectedGroupChat.id}`);

      // Load tin nhắn
      fetchMessages(selectedGroupChat.id);
    }

    // Nhận tin nhắn real-time
    const handleNewMessage = (message: Message) => {
      setMessages((prev) => {
        // Tránh trùng lặp tin nhắn
        if (prev.some((msg) => msg.id === message.id)) {
          return prev;
        }
        return [...prev, message];
      });
    };

    socket?.on("new_message", handleNewMessage);
    socket?.on("group_new_message", (groupChat: GroupChat) => {
      setGroupChats((prev) => {
        // Kiểm tra xem group chat đã tồn tại chưa
        const existingChatIndex = prev.findIndex(
          (chat) => chat.id === groupChat.id
        );
        if (existingChatIndex !== -1) {
          // Nếu tồn tại, di chuyển lên đầu
          const updatedChats = [...prev];
          const [existingChat] = updatedChats.splice(existingChatIndex, 1);
          return [existingChat, ...updatedChats];
        }
        // Nếu không tồn tại, thêm mới vào đầu
        return [groupChat, ...prev];
      });
    });

    // Cleanup khi component unmount hoặc thay đổi group
    return () => {
      if (socket && selectedGroupChat) {
        socket.emit("leave_group", { groupId: selectedGroupChat.id });
        console.log(`Left group ${selectedGroupChat.id}`);
      }
      socket?.off("new_message", handleNewMessage);
    };
  }, [socket, selectedGroupChat]);

  // Load group chats khi khởi động
  useEffect(() => {
    fetchGroupChats(1);
  }, []);

  return (
    <div className="flex h-full bg-gray-100">
      {/* Sidebar */}
      <div className="w-1/4 bg-white border-r border-gray-200 flex flex-col">
        {/* User Info */}
        <div className="p-4 border-b border-gray-200 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <img
              src={user.avatar}
              alt="User Avatar"
              className="w-10 h-10 rounded-full"
            />
            <div>
              <h2 className="text-lg font-semibold">{user.username}</h2>
              <p className="text-sm text-gray-500">Online</p>
            </div>
          </div>
          <button
            onClick={onLogout}
            className="px-3 py-1 bg-red-500 text-white rounded-lg hover:bg-red-600 text-sm"
          >
            Logout
          </button>
        </div>
        {/* New Chat Button */}
        <div className="p-4">
          <button
            onClick={() => setIsPopupOpen(true)}
            className="w-full p-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
          >
            New Chat
          </button>
        </div>
        {/* Group Chat List */}
        <div className="flex-1 overflow-y-auto" id="groupChats">
          <InfiniteScroll
            dataLength={groupChats.length}
            next={() => {
              const nextPage = page + 1;
              setPage(nextPage);
              fetchGroupChats(nextPage);
            }}
            hasMore={hasMore}
            loader={<p className="text-center text-gray-500">Loading...</p>}
            scrollableTarget="groupChats"
          >
            {groupChats.map((chat) => (
              <div
                key={chat.id}
                className={`p-4 flex items-center space-x-3 cursor-pointer hover:bg-gray-100 ${
                  selectedGroupChat?.id === chat.id ? "bg-gray-100" : ""
                }`}
                onClick={() => setSelectedGroupChat(chat)}
              >
                <img
                  src={generateAvatar(chat.name)}
                  alt={chat.name}
                  className="w-10 h-10 rounded-full"
                />
                <div>
                  <h3 className="font-semibold">{chat.name}</h3>
                  {/* <p className="text-sm text-gray-500 truncate">
                    {chat.lastMessage || "No messages yet"}
                  </p> */}
                </div>
              </div>
            ))}
          </InfiniteScroll>
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 flex flex-col">
        {selectedGroupChat ? (
          <>
            {/* Conversation Header */}
            <div className="p-4 bg-white border-b border-gray-200 flex items-center space-x-3">
              <img
                src={generateAvatar(selectedGroupChat.name)}
                alt={selectedGroupChat.name}
                className="w-10 h-10 rounded-full"
              />
              <div>
                <h2 className="text-lg font-semibold">
                  {selectedGroupChat.name}
                </h2>
                <p className="text-sm text-gray-500">
                  {selectedGroupChat.type === "group" ? "Group" : "Personal"}
                </p>
              </div>
            </div>
            {/* Chat Messages */}
            <div className="flex-1 p-4 overflow-y-auto bg-gray-50">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`mb-4 flex ${
                    msg.userId === user.userId ? "justify-end" : "justify-start"
                  }`}
                >
                  <div
                    className={`max-w-xs p-3 rounded-lg ${
                      msg.userId === user.userId
                        ? "bg-blue-500 text-white"
                        : "bg-white border border-gray-200"
                    }`}
                  >
                    <p className="font-semibold">{msg.username}</p>
                    <p>{msg.content}</p>
                    <p className="text-xs text-gray-400 mt-1">
                      {new Date(msg.createdAt).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
            {/* Message Input */}
            <div className="p-4 bg-white border-t border-gray-200 flex items-center space-x-2">
              <input
                type="text"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Type a message..."
                className="flex-1 p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                onKeyPress={(e) => e.key === "Enter" && handleSendMessage()}
              />
              <button
                onClick={handleSendMessage}
                className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
              >
                Send
              </button>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center bg-gray-50">
            <p className="text-gray-500">Select a chat to start messaging</p>
          </div>
        )}
      </div>

      {/* Create Chat Popup */}
      {isPopupOpen && (
        <CreateChatPopup
          user={user}
          onClose={() => setIsPopupOpen(false)}
          onCreateChat={handleCreateChat}
          generateAvatar={generateAvatar}
        />
      )}
    </div>
  );
}

export default ChatScreen;
