import { Route, Routes } from 'react-router-dom'
import { AppShell } from './components/layout/AppShell'
import { Home } from './pages/Home'
import { FetchFromYouTube } from './pages/FetchFromYouTube'
import { UploadVideos } from './pages/UploadVideos'
import { Leaderboard } from './pages/Leaderboard'
import { Settings } from './pages/Settings'
import { Help } from './pages/Help'

function App() {
  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route index element={<Home />} />
        <Route path="fetch" element={<FetchFromYouTube />} />
        <Route path="upload" element={<UploadVideos />} />
        <Route path="leaderboard" element={<Leaderboard />} />
        <Route path="settings" element={<Settings />} />
        <Route path="help" element={<Help />} />
      </Route>
    </Routes>
  )
}

export default App
