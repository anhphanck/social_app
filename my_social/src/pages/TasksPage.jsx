import Navbar from "../components/Navbar";
import Sidebar from "../components/Sidebar";

export default function TasksPage() {
  return (
    <div className="min-h-screen bg-gray-100">
      <Navbar />
      <div className="flex gap-4 p-4">
        <Sidebar />
        <div className="flex-1 bg-white p-6 rounded-md shadow-sm">
          <h1 className="text-xl font-semibold text-sky-700">Quản lý Task dự án</h1>
          <div className="mt-4 text-gray-700">Trang dành cho admin tạo dự án, thêm nhiệm vụ và gán người phụ trách.</div>
        </div>
        <div className="w-72"></div>
      </div>
    </div>
  );
}
