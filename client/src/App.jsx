import { useEffect } from "react"
import { BrowserRouter as Router, Route, Routes, useLocation } from "react-router-dom"
import Landing from "./components/landing"
import Legal from "./components/Legal"

// React Router changes the URL without touching the scroll position, so a menu
// entry that routes to "#features" from another page - or that just moves within
// the landing page - would leave the reader at the top. Follow the hash after
// every navigation and fall back to the top when there is none.
const ScrollToHash = () => {
  const { pathname, hash } = useLocation()

  useEffect(() => {
    const target = hash ? document.getElementById(hash.slice(1)) : null
    if (target) {
      target.scrollIntoView() // smooth, because html has scroll-behavior: smooth
      return
    }
    window.scrollTo(0, 0)
  }, [pathname, hash])

  return null
}

function App() {

  return (
    <Router>
      <ScrollToHash />
      <Routes>
        <Route path="/" element={<Landing/>} />
        <Route path="/terms" element={<Legal/>} />
        <Route path="/privacy" element={<Legal/>} />
        <Route path="*" element={<Landing/>} />
      </Routes>
    </Router>
  )
}

export default App
