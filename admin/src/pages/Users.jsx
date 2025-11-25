import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'

const API_URL = 'http://localhost:5000/api/users'

export default function Users() {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [user, setUser] = useState(null)
  const navigate = useNavigate()

  useEffect(() => {
    const adminUser = localStorage.getItem('adminUser')
    if (adminUser) {
      setUser(JSON.parse(adminUser))
    }

    fetchUsers()
  }, [])

  const fetchUsers = async () => {
    setLoading(true)
    setError('')
    try {
      const token = localStorage.getItem('adminToken')
      const response = await axios.get(API_URL, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      })
      setUsers(response.data)
    } catch (err) {
      setError(err.response?.data?.message || 'Không thể tải danh sách users')
      if (err.response?.status === 401) {
        localStorage.removeItem('adminToken')
        localStorage.removeItem('adminUser')
        navigate('/login')
      }
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = () => {
    localStorage.removeItem('adminToken')
    localStorage.removeItem('adminUser')
    navigate('/login')
  }

  const handleUpdateRole = async (userId, newRole) => {
    try {
      const token = localStorage.getItem('adminToken')
      await axios.put(`${API_URL}/${userId}/role`, 
        { role: newRole },
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      )
      // Refresh danh sách users
      fetchUsers()
    } catch (err) {
      setError(err.response?.data?.message || 'Không thể cập nhật role')
    }
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
              className="border-b-2 border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 py-4 px-1 text-sm font-medium transition"
            >
              Dashboard
            </button>
            <button
              onClick={() => navigate('/users')}
              className="border-b-2 border-indigo-600 text-indigo-600 py-4 px-1 text-sm font-medium"
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
        <div className="mb-8 flex justify-between items-center">
          <div>
            <h2 className="text-3xl font-bold text-gray-900">Quản lý Users</h2>
            <p className="mt-2 text-gray-600">Danh sách tất cả người dùng trong hệ thống</p>
          </div>
          <button
            onClick={fetchUsers}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition text-sm font-medium"
          >
            Làm mới
          </button>
        </div>

        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg">
            {error}
          </div>
        )}

        {loading ? (
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
            <p className="mt-4 text-gray-600">Đang tải...</p>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      ID
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Username
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Email
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Role
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Ngày tạo
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Thao tác
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {users.length === 0 ? (
                    <tr>
                      <td colSpan="6" className="px-6 py-4 text-center text-gray-500">
                        Không có users nào
                      </td>
                    </tr>
                  ) : (
                    users.map((u) => (
                      <tr key={u.id} className="hover:bg-gray-50 transition">
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {u.id}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {u.username}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {u.email}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                            u.role === 'admin' 
                              ? 'bg-purple-100 text-purple-800' 
                              : 'bg-gray-100 text-gray-800'
                          }`}>
                            {u.role === 'admin' ? 'Admin' : 'User'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {u.created_at ? new Date(u.created_at).toLocaleDateString('vi-VN') : '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          {u.role === 'admin' ? (
                            <button
                              onClick={() => handleUpdateRole(u.id, 'user')}
                              className="px-3 py-1 bg-orange-100 text-orange-700 rounded-lg hover:bg-orange-200 transition text-xs font-medium"
                            >
                              Hạ cấp
                            </button>
                          ) : (
                            <button
                              onClick={() => handleUpdateRole(u.id, 'admin')}
                              className="px-3 py-1 bg-indigo-100 text-indigo-700 rounded-lg hover:bg-indigo-200 transition text-xs font-medium"
                            >
                              Thăng cấp
                            </button>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {!loading && users.length > 0 && (
          <div className="mt-4 text-sm text-gray-600">
            Tổng cộng: <span className="font-medium">{users.length}</span> users
          </div>
        )}
      </main>
    </div>
  )
}

