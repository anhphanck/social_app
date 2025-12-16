import Navbar from "../components/Navbar";
import Sidebar from "../components/Sidebar";

export default function MeetingPage() {
  return (
    <div className="h-screen bg-gray-100 flex flex-col overflow-hidden">
      <div className="z-50 shrink-0">
        <Navbar />
      </div>
      <div className="flex flex-1 gap-4 p-4 overflow-hidden">
        <div className="w-64 shrink-0 overflow-y-auto">
          <Sidebar />
        </div>
        <div className="flex-1 bg-white p-6 rounded-md shadow-sm overflow-y-auto">
          <h1 className="text-xl font-semibold text-sky-700">Cuộc họp nhóm</h1>
          <div className="mt-4 text-gray-700">Trang họp nhóm và chia sẻ màn hình.</div>
        </div>
        <div className="w-72 shrink-0"></div>
      </div>
    </div>
  );
}
