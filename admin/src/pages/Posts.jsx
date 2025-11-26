import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'

const API_URL = 'http://localhost:5000/api/posts'

export default function Posts() {
  const [posts, setPosts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [user, setUser] = useState(null)
  const [query, setQuery] = useState('')
  const navigate = useNavigate()

  useEffect(() => {
    const adminUser = localStorage.getItem('adminUser')
    if (adminUser) {
      setUser(JSON.parse(adminUser))
    }

    fetchPosts()
  }, [])

  useEffect(() => {
    const t = setTimeout(async () => {
      if (!query.trim()) {
        fetchPosts()
        return
      }
      setLoading(true)
      setError('')
      try {
        const res = await axios.get(`${API_URL}/search`, { params: { q: query } })
        setPosts(res.data)
      } catch (err) {
        setError(err.response?.data?.message || 'Không thể tìm kiếm bài viết')
      } finally {
        setLoading(false)
      }
    }, 400)
    return () => clearTimeout(t)
  }, [query])

  const fetchPosts = async () => {
    setLoading(true)
    setError('')
    try {
      const response = await axios.get(API_URL)
      setPosts(response.data)
    } catch (err) {
      setError(err.response?.data?.message || 'Không thể tải danh sách bài viết')
    } finally {
      setLoading(false)
    }
  }

  const handleDeletePost = async (postId) => {
    if (!window.confirm('Bạn có chắc chắn muốn xóa bài viết này?')) {
      return
    }

    try {
      const token = localStorage.getItem('adminToken')
      await axios.delete(`${API_URL}/${postId}`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      })
      // Refresh danh sách posts
      fetchPosts()
    } catch (err) {
      setError(err.response?.data?.message || 'Không thể xóa bài viết')
    }
  }

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
              className="border-b-2 border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 py-4 px-1 text-sm font-medium transition"
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
            className="border-b-2 border-indigo-600 text-indigo-600 py-4 px-1 text-sm font-medium"
          >
            Quản lý Bài viết
          </button>
            <button
              onClick={() => navigate('/files')}
              className="border-b-2 border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 py-4 px-1 text-sm font-medium transition"
            >
              Quản lý Tài liệu
            </button>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8 flex justify-between items-center">
          <div>
            <h2 className="text-3xl font-bold text-gray-900">Quản lý Bài viết</h2>
            <p className="mt-2 text-gray-600">Danh sách tất cả bài viết trong hệ thống</p>
          </div>
          <button
            onClick={fetchPosts}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition text-sm font-medium"
          >
            Làm mới
          </button>
        </div>

        <div className="mb-4">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Tìm theo nội dung hoặc tên người dùng"
            className="w-full md:w-1/2 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition text-sm"
          />
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
          <div className={`space-y-4 transition-opacity duration-200 ${loading ? 'opacity-50' : 'opacity-100'}`}>
            {posts.length === 0 ? (
              <div className="bg-white rounded-lg shadow p-12 text-center">
                <p className="text-gray-500">Không có bài viết nào</p>
              </div>
            ) : (
              posts.map((post) => (
                <div key={post.id} className="bg-white rounded-lg shadow p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center">
                        <span className="text-indigo-600 font-semibold">
                          {post.username?.charAt(0).toUpperCase() || 'U'}
                        </span>
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900">{post.username || 'Unknown'}</p>
                        <p className="text-xs text-gray-500">
                          {post.created_at ? new Date(post.created_at).toLocaleString('vi-VN') : '-'}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => handleDeletePost(post.id)}
                      className="px-3 py-1 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition text-xs font-medium"
                    >
                      Xóa
                    </button>
                  </div>
                  
                  {post.content && (
                    <p className="text-gray-700 mb-4 whitespace-pre-wrap">{post.content}</p>
                  )}
                  
                  {post.images && post.images.length > 0 && (
                    <div className="mb-4 grid grid-cols-2 gap-2">
                      {post.images.map((img, idx) => (
                        <img
                          key={idx}
                          src={img}
                          alt={`Post-${idx}`}
                          className="w-full h-auto rounded-lg object-cover"
                          onError={(e) => { e.target.style.display = 'none' }}
                        />
                      ))}
                    </div>
                  )}

                  <div className="flex items-center gap-4 text-sm text-gray-500 pt-4 border-t">
                    <div className="flex items-center gap-1">
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M2 10.5a1.5 1.5 0 113 0v6a1.5 1.5 0 01-3 0v-6zM6 10.333v5.834a1 1 0 001.477.854l4.275-2.667a1 1 0 00.482-.854v-2.506a1 1 0 00.181-.73l1.5-7A1.5 1.5 0 0011.5 3h-5.379a1.5 1.5 0 00-1.42.99l-1.5 4.5A1.5 1.5 0 004.5 10.5z" />
                      </svg>
                      <span>{post.reactions?.like || 0} Like</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M18 10c0 3.866-3.582 7-8 7a8.841 8.841 0 01-4.083-.98L2 17l1.338-3.123C2.493 12.767 2 11.434 2 10c0-3.866 3.582-7 8-7s8 3.134 8 7zM7 9H5v2h2V9zm8 0h-2v2h2V9zM9 9h2v2H9V9z" clipRule="evenodd" />
                      </svg>
                      <span>Comments</span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {!loading && posts.length > 0 && (
          <div className="mt-4 text-sm text-gray-600">
            Tổng cộng: <span className="font-medium">{posts.length}</span> bài viết
          </div>
        )}
      </main>
    </div>
  )
}

