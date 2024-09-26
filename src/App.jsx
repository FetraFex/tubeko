import { BrowserRouter as Router, Route, Routes } from "react-router-dom"
import Main from "./components/Main"
import Landing from "./components/Landing"
import Parking from "./components/Parking"
import Yuka from "./components/yuka"
import Test from "./components/Test"

function App() {

  return (
    <Router>
        <Routes>
          <Route path="/" element={<Landing />}/>
          <Route path="/parking" element={<Parking />}/>
          <Route path="/park" element={<Test />}/>
        </Routes>
    </Router>
  )
}

export default App
