import { useState } from "react";
import axios from "axios";

export interface User {
  userId: string;
  username: string;
  avatar: string;
}

interface AuthScreenProps {
  onAuth: (user: User) => void;
  generateAvatar: (username: string) => string;
}

function AuthScreen({ onAuth, generateAvatar }: AuthScreenProps) {
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    if (!username || !password) {
      setError("Please fill in all fields");
      return;
    }

    try {
      const url = isLogin
        ? "http://localhost:3000/v1/auth/login"
        : "http://localhost:3000/v1/auth/register";
      const response = await axios.post(url, { username, password });
      const { accessToken } = response.data.data;
      localStorage.setItem("accessToken", accessToken);

      const profileResponse = await axios.get(
        "http://localhost:3000/v1/users/profile",
        {
          headers: { Authorization: `Bearer ${accessToken}` },
        }
      );
      const { userId, username: profileUsername } = profileResponse.data.data;

      onAuth({
        userId,
        username: profileUsername,
        avatar: generateAvatar(profileUsername),
      });
      setError("");
    } catch (error: any) {
      setError(error.response?.data?.message || "Authentication failed");
    }
  };

  return (
    <div className="flex items-center justify-center h-full bg-gray-100">
      <div className="w-full max-w-md p-8 bg-white rounded-lg shadow-md">
        <h2 className="text-2xl font-bold text-center mb-6">
          {isLogin ? "Login" : "Register"}
        </h2>
        {error && <p className="text-red-500 text-sm mb-4">{error}</p>}
        <div className="space-y-4">
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="Username"
            className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            onClick={handleSubmit}
            className="w-full p-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
          >
            {isLogin ? "Login" : "Register"}
          </button>
        </div>
        <p className="text-center text-sm mt-4">
          {isLogin ? "Don't have an account?" : "Already have an account?"}{" "}
          <button
            onClick={() => {
              setIsLogin(!isLogin);
              setError("");
            }}
            className="text-blue-500 hover:underline"
          >
            {isLogin ? "Register" : "Login"}
          </button>
        </p>
      </div>
    </div>
  );
}

export default AuthScreen;
