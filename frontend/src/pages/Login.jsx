import { useState } from "react"
import api from "../services/api"

export default function Login({ setAuth }) {
  const [mode, setMode] = useState("login")
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    role: "teacher"
  })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")

  function onChange(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }))
    setError("")
    setSuccess("")
  }

  async function submit(event) {
    event.preventDefault()
    setBusy(true)
    setError("")
    setSuccess("")

    try {
      if (mode === "register") {
        await api.post("/auth/register", {
          name: form.name,
          email: form.email,
          password: form.password,
          role: form.role
        })
        setSuccess("Conta criada com sucesso. Agora faca login.")
        setMode("login")
        setForm((prev) => ({ ...prev, password: "" }))
        return
      }

      const response = await api.post("/auth/login", {
        email: form.email,
        password: form.password
      })
      localStorage.setItem("token", response.data.token)
      setAuth(true)
    } catch (err) {
      setError(err?.response?.data?.error || "Falha na autenticacao.")
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="auth-shell">
      <section className="auth-card">
        <p className="auth-badge">EduFlow</p>
        <h1>{mode === "login" ? "Acesse sua conta" : "Crie sua conta"}</h1>
        <p className="auth-subtitle">
          {mode === "login"
            ? "Entre para gerar e gerenciar atividades."
            : "Cadastre um usuario para testar o fluxo completo."}
        </p>

        <form onSubmit={submit} className="auth-form">
          {mode === "register" && (
            <label className="field">
              Nome
              <input
                value={form.name}
                onChange={(e) => onChange("name", e.target.value)}
                placeholder="Seu nome"
                required
              />
            </label>
          )}

          <label className="field">
            E-mail
            <input
              type="email"
              value={form.email}
              onChange={(e) => onChange("email", e.target.value)}
              placeholder="professor@escola.com"
              required
            />
          </label>

          <label className="field">
            Senha
            <input
              type="password"
              value={form.password}
              onChange={(e) => onChange("password", e.target.value)}
              placeholder="Sua senha"
              required
            />
          </label>

          {mode === "register" && (
            <label className="field">
              Perfil
              <select
                value={form.role}
                onChange={(e) => onChange("role", e.target.value)}
              >
                <option value="teacher">Professor</option>
                <option value="student">Aluno</option>
              </select>
            </label>
          )}

          {error ? <p className="message message-error">{error}</p> : null}
          {success ? <p className="message message-success">{success}</p> : null}

          <button type="submit" className="cta" disabled={busy}>
            {busy ? "Aguarde..." : mode === "login" ? "Entrar" : "Criar conta"}
          </button>
        </form>

        <button
          type="button"
          className="switch-link"
          onClick={() => {
            setMode((prev) => (prev === "login" ? "register" : "login"))
            setError("")
            setSuccess("")
          }}
        >
          {mode === "login"
            ? "Nao tem conta? Cadastre-se"
            : "Ja tem conta? Fazer login"}
        </button>
      </section>
    </main>
  )
}
