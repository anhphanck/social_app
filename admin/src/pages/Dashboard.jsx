import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'

const API_URL = 'http://localhost:5000/api/admin/users'

export default function Dashboard() {
  const [user, setUser] = useState(null)
  const [stats, setStats] = useState({
    totalUsers: 0,
    loading: true
  })
  const navigate = useNavigate()

  useEffect(() => {
    const adminUser = localStorage.getItem('adminUser')
    if (adminUser) {
      setUser(JSON.parse(adminUser))
    }

    // Lấy thống kê
    const token = localStorage.getItem('adminToken')
    if (token) {
      axios.get(API_URL, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      })
      .then(res => {
        setStats({
          totalUsers: res.data.length,
          loading: false
        })
      })
      .catch(err => {
        console.error('Error fetching users:', err)
        setStats({ ...stats, loading: false })
      })
    }
  }, [])

  const handleLogout = () => {
    localStorage.removeItem('adminToken')
    localStorage.removeItem('adminUser')
    navigate('/login')
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <h1 className="text-2xl font-bold text-gray-800">Admin Dashboard</h1>
            <div className="flex items-center gap-4">
              {user && (
                <span className="text-sm text-gray-600">
                  Xin chào, <span className="font-medium">{user.username}</span>
                </span>
              )}
              <button
                onClick={handleLogout}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition text-sm font-medium"
              >
                Đăng xuất
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Navigation */}
      <nav className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex space-x-8">
            <button
              onClick={() => navigate('/dashboard')}
              className="border-b-2 border-indigo-600 text-indigo-600 py-4 px-1 text-sm font-medium"
            >
              Dashboard
            </button>
            <button
              onClick={() => navigate('/users')}
              className="border-b-2 border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 py-4 px-1 text-sm font-medium transition"
            >
              Quản lý Users
            </button>
            <button
              onClick={() => navigate('/posts')}
              className="border-b-2 border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 py-4 px-1 text-sm font-medium transition"
            >
              Quản lý Bài viết
            </button>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-gray-900">Tổng quan</h2>
          <p className="mt-2 text-gray-600">Thống kê và quản lý hệ thống</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0 bg-indigo-100 rounded-lg p-3">
                <svg className="h-6 w-6 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Tổng số Users</p>
                <p className="text-2xl font-bold text-gray-900">
                  {stats.loading ? '...' : stats.totalUsers}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0 bg-green-100 rounded-lg p-3">
                <svg className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Hệ thống</p>
                <p className="text-2xl font-bold text-gray-900">Hoạt động</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0 bg-blue-100 rounded-lg p-3">
                <svg className="h-6 w-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Phiên bản</p>
                <p className="text-2xl font-bold text-gray-900">v1.0</p>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Thao tác nhanh</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <button
              onClick={() => navigate('/users')}
              className="p-4 border-2 border-gray-200 rounded-lg hover:border-indigo-500 hover:bg-indigo-50 transition text-left"
            >
              <div className="font-medium text-gray-900">Quản lý Users</div>
              <div className="text-sm text-gray-600 mt-1">Xem và quản lý tất cả người dùng</div>
            </button>
            <button
              onClick={() => navigate('/posts')}
              className="p-4 border-2 border-gray-200 rounded-lg hover:border-indigo-500 hover:bg-indigo-50 transition text-left"
            >
              <div className="font-medium text-gray-900">Quản lý Bài viết</div>
              <div className="text-sm text-gray-600 mt-1">Xem và quản lý tất cả bài viết</div>
            </button>
          </div>
        </div>
      </main>
    </div>
  )
}

