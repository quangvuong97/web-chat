import { useState, useEffect } from "react";
import axios from "axios";
import InfiniteScroll from "react-infinite-scroll-component";

interface User {
  userId: string;
  username: string;
  avatar: string;
}

interface Friend {
  userId: string;
  username: string;
}

interface GroupChat {
  id: string;
  name: string;
  type: string;
}

interface CreateChatPopupProps {
  user: User;
  onClose: () => void;
  onCreateChat: (groupChat: GroupChat) => void;
  generateAvatar: (username: string) => string;
}

function CreateChatPopup({
  user,
  onClose,
  onCreateChat,
  generateAvatar,
}: CreateChatPopupProps) {
  const [isGroupChat, setIsGroupChat] = useState(false);
  const [groupName, setGroupName] = useState("");
  const [selectedFriends, setSelectedFriends] = useState<string[]>([]);
  const [friends, setFriends] = useState<Friend[]>([]);
  const [keyword, setKeyword] = useState("");
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState("");

  const fetchFriends = async (pageNum: number, searchKeyword: string = "") => {
    try {
      const response = await axios.get(
        "http://localhost:3000/v1/users/friends",
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
          },
          params: {
            page: pageNum,
            size: 20,
            keyword: searchKeyword || undefined,
          },
        }
      );
      const newFriends = response.data.data;
      setFriends((prev) =>
        pageNum === 1 ? newFriends : [...prev, ...newFriends]
      );
      setHasMore(newFriends.length === 20);
    } catch (error) {
      console.error("Failed to fetch friends:", error);
    }
  };

  useEffect(() => {
    fetchFriends(1, keyword);
  }, [keyword]);

  const handleCreateChat = async () => {
    if (!isGroupChat && selectedFriends.length !== 1) {
      setError("Please select one friend for personal chat");
      return;
    }
    if (isGroupChat && (!groupName || selectedFriends.length === 0)) {
      setError("Please provide group name and select at least one friend");
      return;
    }

    try {
      const response = await axios.post(
        "http://localhost:3000/v1/group-chats",
        {
          name: isGroupChat
            ? groupName
            : friends.find((f) => f.userId === selectedFriends[0])?.username ||
              selectedFriends[0],
          members: selectedFriends,
          type: isGroupChat ? "group" : "personal",
        },
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
          },
        }
      );
      const { id } = response.data.data;
      onCreateChat({
        id,
        name: isGroupChat
          ? groupName
          : friends.find((f) => f.userId === selectedFriends[0])?.username ||
            selectedFriends[0],
        type: isGroupChat ? "1" : "2",
      });
      setError("");
    } catch (error: any) {
      setError(error.response?.data?.message || "Failed to create chat");
    }
  };

  const toggleFriend = (userId: string) => {
    setSelectedFriends((prev) =>
      prev.includes(userId)
        ? prev.filter((id) => id !== userId)
        : [...prev, userId]
    );
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
      <div className="bg-white p-6 rounded-lg shadow-lg w-full max-w-md">
        <h2 className="text-xl font-bold mb-4">
          {isGroupChat ? "Create Group Chat" : "Start Personal Chat"}
        </h2>
        {error && <p className="text-red-500 text-sm mb-4">{error}</p>}
        <div className="space-y-4">
          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={isGroupChat}
              onChange={() => setIsGroupChat(!isGroupChat)}
              className="h-4 w-4"
            />
            <label>Create as group chat</label>
          </div>
          {isGroupChat && (
            <input
              type="text"
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              placeholder="Group name"
              className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          )}
          <input
            type="text"
            value={keyword}
            onChange={(e) => {
              setKeyword(e.target.value);
              setPage(1);
              setFriends([]);
            }}
            placeholder="Search friends..."
            className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <div className="max-h-40 overflow-y-auto" id="friendsList">
            <InfiniteScroll
              dataLength={friends.length}
              next={() => {
                const nextPage = page + 1;
                setPage(nextPage);
                fetchFriends(nextPage, keyword);
              }}
              hasMore={hasMore}
              loader={<p className="text-center text-gray-500">Loading...</p>}
              scrollableTarget="friendsList"
            >
              {friends.map((friend) => (
                <div
                  key={friend.userId}
                  className={`p-2 flex items-center space-x-2 cursor-pointer hover:bg-gray-100 ${
                    selectedFriends.includes(friend.userId) ? "bg-gray-100" : ""
                  }`}
                  onClick={() => toggleFriend(friend.userId)}
                >
                  <input
                    type="checkbox"
                    checked={selectedFriends.includes(friend.userId)}
                    onChange={() => toggleFriend(friend.userId)}
                    className="h-4 w-4"
                  />
                  <img
                    src={generateAvatar(friend.username)}
                    alt={friend.username}
                    className="w-8 h-8 rounded-full"
                  />
                  <span>{friend.username}</span>
                </div>
              ))}
            </InfiniteScroll>
          </div>
          <div className="flex space-x-2">
            <button
              onClick={handleCreateChat}
              className="flex-1 p-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
            >
              Create
            </button>
            <button
              onClick={onClose}
              className="flex-1 p-2 bg-gray-300 text-black rounded-lg hover:bg-gray-400"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default CreateChatPopup;
