import Navbar from "../components/Navbar";
import Sidebar from "../components/Sidebar";

export default function MeetingPage() {
  return (
    <div className="min-h-screen bg-gray-100">
      <Navbar />
      <div className="flex gap-4 p-4">
        <Sidebar />
        <div className="flex-1 bg-white p-6 rounded-md shadow-sm">
          <h1 className="text-xl font-semibold text-sky-700">Cuộc họp nhóm</h1>
          <div className="mt-4 text-gray-700">Trang họp nhóm và chia sẻ màn hình.</div>
        </div>
      </div>
    </div>
  );
}
