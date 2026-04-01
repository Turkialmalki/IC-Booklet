import { Routes, Route, Navigate } from 'react-router-dom'
import Dashboard from './pages/Dashboard.jsx'
import Editor from './pages/Editor.jsx'
import Import from './pages/Import.jsx'
import Preview from './pages/Preview.jsx'
import Export from './pages/Export.jsx'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="/dashboard" element={<Dashboard />} />
      <Route path="/editor/:templateId?" element={<Editor />} />
      <Route path="/import/:templateId" element={<Import />} />
      <Route path="/preview/:templateId" element={<Preview />} />
      <Route path="/export/:jobId" element={<Export />} />
    </Routes>
  )
}
