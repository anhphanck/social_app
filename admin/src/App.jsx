import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Users from './pages/Users'
import Posts from './pages/Posts'

function PrivateRoute({ children }) {
  const token = localStorage.getItem('adminToken')
  const adminUser = localStorage.getItem('adminUser')
  
  if (!token) {
    return <Navigate to="/login" replace />
  }
  
  // Kiểm tra role nếu có thông tin user
  if (adminUser) {
    try {
      const user = JSON.parse(adminUser)
      if (user.role !== 'admin') {
        // Nếu không phải admin, xóa token và chuyển về login
        localStorage.removeItem('adminToken')
        localStorage.removeItem('adminUser')
        return <Navigate to="/login" replace />
      }
    } catch (e) {
      // Nếu parse lỗi, xóa và chuyển về login
      localStorage.removeItem('adminToken')
      localStorage.removeItem('adminUser')
      return <Navigate to="/login" replace />
    }
  }
  
  return children
}

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route 
          path="/dashboard" 
          element={
            <PrivateRoute>
              <Dashboard />
            </PrivateRoute>
          } 
        />
        <Route 
          path="/users" 
          element={
            <PrivateRoute>
              <Users />
            </PrivateRoute>
          } 
        />
        <Route 
          path="/posts" 
          element={
            <PrivateRoute>
              <Posts />
            </PrivateRoute>
          } 
        />
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </Router>
  )
}

export default App

