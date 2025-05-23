import { useState, useEffect } from "react";
import ChatScreen from "./components/chat/chat";
import AuthScreen from "./components/auth/auth";
import axios from "axios";
import io, { Socket } from "socket.io-client";

// Định nghĩa types
interface User {
  userId: string;
  username: string;
  avatar: string;
}

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(
    !!localStorage.getItem("accessToken")
  );
  const [user, setUser] = useState<User>({
    userId: "",
    username: "",
    avatar: "",
  });
  const [socket, setSocket] = useState<Socket | null>(null);

  // Kết nối Socket.IO khi đã đăng nhập
  useEffect(() => {
    if (user.userId) {
      const token = localStorage.getItem("accessToken");
      if (token && !socket) {
        const newSocket = io("http://ec2-13-239-36-171.ap-southeast-2.compute.amazonaws.com:3000/chat", {
          auth: { token },
          transports: ["websocket"],
        });

        newSocket.on("connect", () => {
          console.log("Connected to socket");
        });

        newSocket.on("error", (error) => {
          console.error("Socket error:", error.message);
        });

        setSocket(newSocket);

        // Cleanup khi ngắt kết nối
        return () => {
          newSocket.disconnect();
          console.log("Disconnected from socket");
          setSocket(null);
        };
      }
    }
  }, [user.userId]);

  // Lấy profile
  useEffect(() => {
    const fetchProfile = async () => {
      const token = localStorage.getItem("accessToken");
      if (token) {
        try {
          const response = await axios.get(
            "http://ec2-13-239-36-171.ap-southeast-2.compute.amazonaws.com:3000/v1/users/profile",
            {
              headers: { Authorization: `Bearer ${token}` },
            }
          );
          const { userId, username } = response.data.data;
          setUser({
            userId,
            username,
            avatar: generateAvatar(username),
          });
        } catch (error) {
          console.error("Failed to fetch profile:", error);
          localStorage.removeItem("accessToken");
          setIsAuthenticated(false);
        }
      }
    };
    fetchProfile();
  }, []);

  const handleAuth = async (userData: User) => {
    setUser(userData);
    setIsAuthenticated(true);
  };

  const handleLogout = () => {
    if (socket) {
      socket.disconnect();
      setSocket(null);
    }
    localStorage.removeItem("accessToken");
    setIsAuthenticated(false);
    setUser({ userId: "", username: "", avatar: "" });
  };

  // Hàm tạo avatar với màu nền
  const generateAvatar = (username: string): string => {
    const colors = [
      "#F44336",
      "#E91E63",
      "#9C27B0",
      "#673AB7",
      "#3F51B5",
      "#2196F3",
      "#03A9F4",
      "#00BCD4",
      "#009688",
      "#4CAF50",
      "#8BC34A",
      "#CDDC39",
      "#FFEB3B",
      "#FFC107",
      "#FF9800",
    ];
    const index = username.charCodeAt(0) % colors.length;
    return `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 40 40'%3E%3Ccircle cx='20' cy='20' r='20' fill='${encodeURIComponent(
      colors[index]
    )}'/%3E%3Ctext x='50%' y='50%' text-anchor='middle' dy='.3em' font-size='20' fill='white' font-family='Arial'%3E${username[0].toUpperCase()}%3C/text%3E%3C/svg%3E`;
  };

  return (
    <div className="h-screen">
      {isAuthenticated ? (
        <ChatScreen
          user={user}
          onLogout={handleLogout}
          generateAvatar={generateAvatar}
          socket={socket}
        />
      ) : (
        <AuthScreen onAuth={handleAuth} generateAvatar={generateAvatar} />
      )}
    </div>
  );
}

export default App;
