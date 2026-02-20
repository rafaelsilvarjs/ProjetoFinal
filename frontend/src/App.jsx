import { useEffect, useState } from "react"
import Login from "./pages/Login"
import Dashboard from "./pages/Dashboard"
import StudentPortal from "./pages/StudentPortal"
import "./styles.css"

function parseJwtPayload(token) {
  try {
    const [, payload] = token.split(".")
    if (!payload) return {}
    const base64 = payload.replace(/-/g, "+").replace(/_/g, "/")
    const json = atob(base64)
    return JSON.parse(json)
  } catch {
    return {}
  }
}

function getSession() {
  const token = localStorage.getItem("token")
  if (!token) return { auth: false, role: "" }
  const payload = parseJwtPayload(token)
  return {
    auth: true,
    role: String(payload.role || "").toLowerCase()
  }
}

export default function App() {
  const [session, setSession] = useState(getSession())

  useEffect(() => {
    const syncAuth = () => setSession(getSession())
    window.addEventListener("storage", syncAuth)
    return () => window.removeEventListener("storage", syncAuth)
  }, [])

  if (!session.auth) {
    return <Login setAuth={() => setSession(getSession())} />
  }

  if (session.role === "student") {
    return <StudentPortal setAuth={() => setSession(getSession())} />
  }

  return <Dashboard setAuth={() => setSession(getSession())} />
}
