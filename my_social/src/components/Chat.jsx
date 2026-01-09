import { useContext } from "react";
import { UserContext } from "../context/UserContext";

export default function Chat() {
  const { currentChatId, setCurrentChatId } = useContext(UserContext);

  if (!currentChatId) return null;

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black/30 p-4 z-50">
      <div className="bg-white p-6 rounded-lg shadow-xl max-w-sm w-full text-center">
        <h3 className="text-xl font-semibold mb-2 text-gray-800">Tính năng Chat</h3>
        <p className="text-gray-600 mb-6">Tính năng này đang được cập nhật. Vui lòng quay lại sau!</p>
        <button 
          onClick={() => setCurrentChatId(null)} 
          className="px-4 py-2 bg-sky-600 text-white rounded hover:bg-sky-700 transition"
        >
          Đóng
        </button>
      </div>
    </div>
  );
}
