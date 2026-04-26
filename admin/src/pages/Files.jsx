import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'

const API_URL = '/api/documents'
const API_CLASSES = '/api/classes'

export default function Files() {
  const [docs, setDocs] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [user, setUser] = useState(null)
  const [classes, setClasses] = useState([])
  const [selectedClass, setSelectedClass] = useState('')
  const [query, setQuery] = useState('')
  const navigate = useNavigate()

  useEffect(() => {
    const adminUser = localStorage.getItem('adminUser')
    if (adminUser) setUser(JSON.parse(adminUser))
    fetchClasses()
  }, [])

  const fetchClasses = async () => {
    try {
      const token = localStorage.getItem('adminToken')
      const res = await axios.get(API_CLASSES, { headers: { Authorization: `Bearer ${token}` } })
      const list = res.data || []
      setClasses(list)
      
      setSelectedClass('') 
    } catch (err) {
      setSelectedClass('')
    }
  }

  
  const fetchDocs = async (cls = selectedClass, searchQuery = query) => {
    setLoading(true)
    setError('')
    try {
      const token = localStorage.getItem('adminToken')
      const params = {}
      if (cls) params.class = cls
      if (searchQuery) params.q = searchQuery
      
      const res = await axios.get(API_URL, { 
        params,
        headers: { Authorization: `Bearer ${token}` } 
      })
      setDocs(res.data || [])
    } catch (err) {
      setError(err.response?.data?.message || 'Không thể tải danh sách tài liệu')
    } finally {
      setLoading(false)
    }
  }

  
  useEffect(() => {
    const adminUser = localStorage.getItem('adminUser')
    if (adminUser) setUser(JSON.parse(adminUser))
    fetchClasses()
  }, [])

  
  useEffect(() => {
    
    
    
    
    
    
    const t = setTimeout(() => {
        fetchDocs(selectedClass, query)
    }, 400)
    return () => clearTimeout(t)
  }, [query, selectedClass])

  const handleDeleteDoc = async (id) => {
    if (!window.confirm('Bạn có chắc chắn muốn xóa tài liệu này?')) return
    try {
      const token = localStorage.getItem('adminToken')
      await axios.delete(`${API_URL}/${id}`, { headers: { Authorization: `Bearer ${token}` } })
      fetchDocs()
    } catch (err) {
      setError(err.response?.data?.message || 'Không thể xóa tài liệu')
    }
  }

  const handleLogout = () => {
    localStorage.removeItem('adminToken')
    localStorage.removeItem('adminUser')
    navigate('/login')
  }

  const handleDownload = async (e, doc) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('adminToken')
      const res = await axios.get(`/api/documents/download/${doc.id}`, {
        headers: { Authorization: `Bearer ${token}` },
        responseType: 'blob'
      })
      const blob = new Blob([res.data])
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      const cd = res.headers['content-disposition'] || ''
      let filename = doc.original_name || 'download'
      const match = cd.match(/filename="([^"]+)"/)
      if (match && match[1]) filename = decodeURIComponent(match[1])
      a.download = filename
      document.body.appendChild(a)
      a.click()
      a.remove()
      window.URL.revokeObjectURL(url)
    } catch (err) {
      setError(err?.response?.data?.message || 'Không thể tải tài liệu')
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
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
              <button onClick={handleLogout} className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition text-sm font-medium">Đăng xuất</button>
            </div>
          </div>
        </div>
      </header>

      <nav className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex space-x-8">
            <button onClick={() => navigate('/dashboard')} className="border-b-2 border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 py-4 px-1 text-sm font-medium transition">Dashboard</button>
            <button onClick={() => navigate('/users')} className="border-b-2 border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 py-4 px-1 text-sm font-medium transition">Quản lý Users</button>
            <button onClick={() => navigate('/posts')} className="border-b-2 border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 py-4 px-1 text-sm font-medium transition">Quản lý Bài viết</button>
            <button onClick={() => navigate('/files')} className="border-b-2 border-indigo-600 text-indigo-600 py-4 px-1 text-sm font-medium">Quản lý Tài liệu</button>
            <button onClick={() => navigate('/classes')} className="border-b-2 border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 py-4 px-1 text-sm font-medium transition">Quản lý Lớp</button>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8 flex justify-between items-center">
          <div>
            <h2 className="text-3xl font-bold text-gray-900">Quản lý Tài liệu</h2>
            <p className="mt-2 text-gray-600">Lọc và quản lý theo lớp để dễ theo dõi</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <label className="text-sm text-gray-700">Lớp:</label>
              <select
                value={selectedClass}
                onChange={async (e) => { const c = e.target.value; setSelectedClass(c); await fetchDocs(c); }}
                className="border rounded px-3 py-2 text-sm"
              >
                <option value="">Tất cả</option>
                {classes.length > 0 ? (
                  classes.map(c => (<option key={c.id} value={c.code}>{c.code}</option>))
                ) : (
                  ['A','B','C','D'].map(code => (<option key={code} value={code}>{code}</option>))
                )}
              </select>
            </div>
            <button onClick={() => fetchDocs(selectedClass, query)} className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition text-sm font-medium">Làm mới</button>
          </div>
        </div>

        <div className="mb-4">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Tìm theo tên tài liệu hoặc người dùng"
            className="w-full md:w-1/2 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition text-sm"
          />
        </div>

        {error && <div className="mb-4 p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg">{error}</div>}

        {loading ? (
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
            <p className="mt-4 text-gray-600">Đang tải...</p>
          </div>
        ) : (
          <div className="space-y-4">
            {docs.length === 0 ? (
              <div className="bg-white rounded-lg shadow p-12 text-center">
                <p className="text-gray-500">Không có tài liệu nào</p>
              </div>
            ) : (
              docs.map((d, idx) => (
                <div key={d.id} className="bg-white rounded-lg shadow p-6">
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-indigo-100 rounded-full flex items-center justify-center">
                        <span className="text-indigo-600 text-sm font-semibold">{idx + 1}</span>
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900">{d.original_name}</p>
                        <p className="text-xs text-gray-500">Người tải lên: {d.username || d.user_id}</p>
                        <p className="text-xs text-gray-500">{d.created_at ? new Date(d.created_at).toLocaleString('vi-VN') : '-'}</p>
                        {selectedClass && (
                          <p className="text-xs text-gray-500">Lớp: {selectedClass}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <a href={d.url} target="_blank" rel="noreferrer" className="px-3 py-1 bg-indigo-100 text-indigo-700 rounded-lg hover:bg-indigo-200 transition text-xs font-medium">Xem</a>
                      <a href="#" onClick={(e) => handleDownload(e, d)} className="px-3 py-1 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition text-xs font-medium">Tải</a>
                      <button onClick={() => handleDeleteDoc(d.id)} className="px-3 py-1 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition text-xs font-medium">Xóa</button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {!loading && docs.length > 0 && (
          <div className="mt-4 text-sm text-gray-600">Tổng cộng: <span className="font-medium">{docs.length}</span> tài liệu</div>
        )}
      </main>
    </div>
  )
}
