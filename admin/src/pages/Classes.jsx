import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'

const API_CLASSES = '/api/classes'
const API_ADMIN_USERS = '/api/admin/users'

export default function Classes() {
  const [user, setUser] = useState(null)
  const [classes, setClasses] = useState([])
  const [teachers, setTeachers] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [code, setCode] = useState('A')
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [homeroomIds, setHomeroomIds] = useState([])
  const [editingId, setEditingId] = useState(null)
  const [editCode, setEditCode] = useState('')
  const [editName, setEditName] = useState('')
  const [editDescription, setEditDescription] = useState('')
  const [editHomeroomIds, setEditHomeroomIds] = useState([])
  const navigate = useNavigate()

  const token = localStorage.getItem('adminToken')
  const headers = { Authorization: `Bearer ${token}` }

  const fetchData = async () => {
    setLoading(true)
    setError('')
    try {
      const [clsRes, usrRes] = await Promise.all([
        axios.get(API_CLASSES, { headers }),
        axios.get(API_ADMIN_USERS, { headers })
      ])
      setClasses(Array.isArray(clsRes.data) ? clsRes.data : [])
      const rawUsers = Array.isArray(usrRes.data) ? usrRes.data : []
      const ts = rawUsers.filter(u => u.role === 'teacher')
      setTeachers(ts)
    } catch (e) {
      setError(e.response?.data?.message || 'Không thể tải dữ liệu lớp')
      if (e.response?.status === 401) {
        localStorage.removeItem('adminToken')
        localStorage.removeItem('adminUser')
        navigate('/login')
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { 
    const adminUser = localStorage.getItem('adminUser')
    if (adminUser) {
      try {
        setUser(JSON.parse(adminUser))
      } catch (e) {
        console.error('Invalid user data', e)
        localStorage.removeItem('adminUser')
      }
    }
    fetchData() 
  }, [])

  const resetCreateForm = () => {
    setCode('A')
    setName('')
    setDescription('')
    setHomeroomIds([])
  }

  const handleCreate = async (e) => {
    e.preventDefault()
    setError('')
    try {
      const body = {
        code: String(code || '').trim().toUpperCase(),
        name: name || null,
        description: description || null,
        homeroom_teacher_ids: homeroomIds
      }
      await axios.post(API_CLASSES, body, { headers })
      resetCreateForm()
      fetchData()
    } catch (err) {
      setError(err.response?.data?.message || 'Không thể tạo lớp')
    }
  }

  const startEdit = (c) => {
    setEditingId(c.id)
    setEditCode(c.code || '')
    setEditName(c.name || '')
    setEditDescription(c.description || '')
    const ids = String(c.homeroom_teacher_ids || '')
      .split(',')
      .map(s => s.trim())
      .filter(Boolean)
      .map(s => Number(s))
    setEditHomeroomIds(ids)
  }

  const cancelEdit = () => {
    setEditingId(null)
    setEditCode('')
    setEditName('')
    setEditDescription('')
    setEditHomeroomIds([])
  }

  const saveEdit = async (id) => {
    setError('')
    try {
      const body = {}
      if (editCode) body.code = String(editCode).trim().toUpperCase()
      body.name = editName || null
      body.description = editDescription || null
      body.homeroom_teacher_ids = editHomeroomIds
      await axios.put(`${API_CLASSES}/${id}`, body, { headers })
      cancelEdit()
      fetchData()
    } catch (err) {
      setError(err.response?.data?.message || 'Không thể cập nhật lớp')
    }
  }

  const deleteClass = async (id) => {
    if (!window.confirm('Bạn có chắc chắn muốn xóa lớp này?')) return
    setError('')
    try {
      await axios.delete(`${API_CLASSES}/${id}`, { headers })
      fetchData()
    } catch (err) {
      setError(err.response?.data?.message || 'Không thể xóa lớp')
    }
  }

  const handleLogout = () => {
    localStorage.removeItem('adminToken')
    localStorage.removeItem('adminUser')
    navigate('/login')
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {}
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

      {}
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
              className="border-b-2 border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 py-4 px-1 text-sm font-medium transition"
            >
              Quản lý Bài viết
            </button>
            <button
              onClick={() => navigate('/files')}
              className="border-b-2 border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 py-4 px-1 text-sm font-medium transition"
            >
              Quản lý Tài liệu
            </button>
            <button
              onClick={() => navigate('/classes')}
              className="border-b-2 border-indigo-600 text-indigo-600 py-4 px-1 text-sm font-medium"
            >
              Quản lý Lớp
            </button>
          </div>
        </div>
      </nav>

      {}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8 flex justify-between items-center">
          <div>
            <h2 className="text-3xl font-bold text-gray-900">Quản lý Lớp</h2>
            <p className="mt-2 text-gray-600">Quản lý danh sách lớp và giáo viên chủ nhiệm</p>
          </div>
          <button
            onClick={fetchData}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition disabled:opacity-50"
          >
            {loading ? 'Đang làm mới...' : 'Làm mới'}
          </button>
        </div>
        
        <div className="px-4 py-6 sm:px-0">
          {error && <div className="mb-4 p-3 bg-red-100 text-red-700 rounded">{error}</div>}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white p-6 rounded-lg shadow">
              <div className="text-lg font-medium mb-4">Tạo lớp</div>
              <form onSubmit={handleCreate} className="space-y-3">
                <div>
                  <label className="block text-sm text-gray-700 mb-1">Mã lớp</label>
                  <input value={code} onChange={e => setCode(e.target.value)} className="w-full border rounded px-3 py-2" placeholder="A" />
                </div>
                <div>
                  <label className="block text-sm text-gray-700 mb-1">Tên lớp</label>
                  <input value={name} onChange={e => setName(e.target.value)} className="w-full border rounded px-3 py-2" placeholder="Lớp A" />
                </div>
                <div>
                  <label className="block text-sm text-gray-700 mb-1">Mô tả</label>
                  <textarea value={description} onChange={e => setDescription(e.target.value)} className="w-full border rounded px-3 py-2" placeholder="Mô tả" />
                </div>
                <div>
                  <label className="block text-sm text-gray-700 mb-1">Giáo viên chủ nhiệm</label>
                  <div className="flex items-center gap-2 mb-2">
                    <button
                      type="button"
                      onClick={() => setHomeroomIds(teachers.map(t => t.id))}
                      className="px-3 py-1 rounded border"
                    >
                      Chọn tất cả
                    </button>
                    <button
                      type="button"
                      onClick={() => setHomeroomIds([])}
                      className="px-3 py-1 rounded border"
                    >
                      Bỏ chọn tất cả
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {teachers.map(t => {
                      const checked = homeroomIds.includes(t.id)
                      return (
                        <button
                          key={t.id}
                          type="button"
                          onClick={() => setHomeroomIds(prev => prev.includes(t.id) ? prev.filter(x => x !== t.id) : [...prev, t.id])}
                          className={`px-3 py-1 rounded border ${checked ? 'bg-indigo-600 text-white' : 'bg-white'}`}
                        >
                          {t.username}
                        </button>
                      )
                    })}
                  </div>
                </div>
                <button type="submit" className="px-4 py-2 bg-indigo-600 text-white rounded">Tạo</button>
              </form>
            </div>
            <div className="md:col-span-2 bg-white p-6 rounded-lg shadow">
              <div className="flex justify-between items-center mb-4">
                <div className="text-lg font-medium">Danh sách lớp</div>
                {loading && <div className="text-sm text-gray-500">Đang tải...</div>}
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">ID</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Mã</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tên</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Giáo viên CN</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Mô tả</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {classes.map(c => {
                      const teacher = teachers.find(t => String(t.id) === String(c.homeroom_teacher_id))
                      return (
                        <tr key={c.id}>
                          <td className="px-6 py-2 text-sm">{c.id}</td>
                          <td className="px-6 py-2 text-sm">
                            {c.code}
                          </td>
                          <td className="px-6 py-2 text-sm">
                            {c.name || ''}
                          </td>
                          <td className="px-6 py-2 text-sm">
                            {(() => {
                              const names = String(c.homeroom_teacher_usernames || '').split(',').filter(Boolean)
                              if (names.length > 0) return names.join(', ')
                              if (teacher) return teacher.username
                              return ''
                            })()}
                          </td>
                          <td className="px-6 py-2 text-sm">
                            {c.description || ''}
                          </td>
                          <td className="px-6 py-2 text-sm">
                            <div className="flex gap-2">
                              <button onClick={() => startEdit(c)} className="px-3 py-1 bg-indigo-600 text-white rounded">Sửa</button>
                              <button onClick={() => deleteClass(c.id)} className="px-3 py-1 bg-red-600 text-white rounded">Xóa</button>
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </main>
      {editingId !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-xl max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b">
              <div className="text-lg font-semibold">Sửa lớp</div>
              <button onClick={cancelEdit} className="px-3 py-1 rounded bg-gray-100">Đóng</button>
            </div>
            <div className="p-4 space-y-4">
              <div>
                <div className="text-sm text-gray-700 mb-1">Mã lớp</div>
                <input value={editCode} onChange={e => setEditCode(e.target.value)} className="w-full border rounded px-3 py-2" placeholder="A" />
              </div>
              <div>
                <div className="text-sm text-gray-700 mb-1">Tên lớp</div>
                <input value={editName} onChange={e => setEditName(e.target.value)} className="w-full border rounded px-3 py-2" placeholder="Lớp A" />
              </div>
              <div>
                <div className="text-sm text-gray-700 mb-1">Mô tả</div>
                <textarea value={editDescription} onChange={e => setEditDescription(e.target.value)} className="w-full border rounded px-3 py-2" placeholder="Mô tả" />
              </div>
              <div>
                <div className="text-sm text-gray-700 mb-1">Giáo viên chủ nhiệm</div>
                <div className="flex items-center gap-2 mb-2">
                  <button
                    type="button"
                    onClick={() => setEditHomeroomIds(teachers.map(t => t.id))}
                    className="px-3 py-1 rounded border"
                  >
                    Chọn tất cả
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditHomeroomIds([])}
                    className="px-3 py-1 rounded border"
                  >
                    Bỏ chọn tất cả
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {teachers.map(t => {
                    const checked = editHomeroomIds.includes(t.id)
                    return (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => setEditHomeroomIds(prev => prev.includes(t.id) ? prev.filter(x => x !== t.id) : [...prev, t.id])}
                        className={`px-3 py-1 rounded border ${checked ? 'bg-indigo-600 text-white' : 'bg-white'}`}
                      >
                        {t.username}
                      </button>
                    )
                  })}
                </div>
              </div>
            </div>
            <div className="p-4 border-t flex justify-end gap-2">
              <button onClick={cancelEdit} className="px-4 py-2 rounded bg-gray-200">Hủy</button>
              <button onClick={() => saveEdit(editingId)} className="px-4 py-2 rounded bg-indigo-600 text-white">Lưu</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

