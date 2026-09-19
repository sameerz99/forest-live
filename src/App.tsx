import { AdminScreen } from './components/AdminScreen/AdminScreen'
import { LiveScreen } from './components/LiveScreen/LiveScreen'
import './App.css'

function App() {
  const isAdmin = window.location.pathname.replace(/\/$/, '') === '/admin'

  return isAdmin ? <AdminScreen /> : <LiveScreen />
}

export default App
