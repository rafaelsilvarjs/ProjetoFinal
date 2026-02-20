import { useMemo, useState } from "react"
import api from "../services/api"

function isNetworkUnavailable(err) {
  return err?.code === "ERR_NETWORK" || !err?.response
}

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

function formatDifficulty(value) {
  const map = {
    easy: "Fácil",
    medium: "Médio",
    hard: "Difícil"
  }
  return map[String(value || "").toLowerCase()] || value || "-"
}

function formatSchoolYear(value) {
  const map = {
    "6_ano_fundamental": "6º ano Fundamental",
    "7_ano_fundamental": "7º ano Fundamental",
    "8_ano_fundamental": "8º ano Fundamental",
    "9_ano_fundamental": "9º ano Fundamental",
    "1_ano_medio": "1º ano Médio",
    "2_ano_medio": "2º ano Médio",
    "3_ano_medio": "3º ano Médio"
  }
  return map[value] || value || "-"
}

function buildAttentionTip(student) {
  if (student.accuracy < 40) {
    return "Reforco individual com revisao guiada e verificacao frequente."
  }
  if (student.weakestDifficulty === "hard") {
    return "Trabalhar interpretacao de enunciados complexos e justificativas."
  }
  if (student.weakestDifficulty === "medium") {
    return "Aumentar exercicios de aplicacao pratica com exemplos reais."
  }
  return "Manter progressao com desafios curtos e acompanhamento continuo."
}

const difficultyOptions = [
  { value: "easy", label: "Facil" },
  { value: "medium", label: "Medio" },
  { value: "hard", label: "Dificil" }
]

const schoolYearOptions = [
  { value: "6_ano_fundamental", label: "6o ano Fundamental" },
  { value: "7_ano_fundamental", label: "7o ano Fundamental" },
  { value: "8_ano_fundamental", label: "8o ano Fundamental" },
  { value: "9_ano_fundamental", label: "9o ano Fundamental" },
  { value: "1_ano_medio", label: "1o ano Medio" },
  { value: "2_ano_medio", label: "2o ano Medio" },
  { value: "3_ano_medio", label: "3o ano Medio" }
]

export default function Dashboard({ setAuth }) {
  const [topic, setTopic] = useState("")
  const [className, setClassName] = useState("Turma A")
  const [difficulty, setDifficulty] = useState("medium")
  const [schoolYear, setSchoolYear] = useState("1_ano_medio")
  const [draft, setDraft] = useState(null)
  const [activities, setActivities] = useState([])
  const [stats, setStats] = useState(null)
  const [busy, setBusy] = useState(false)
  const [status, setStatus] = useState("")
  const [error, setError] = useState("")

  const userRole = useMemo(() => {
    const token = localStorage.getItem("token")
    const payload = parseJwtPayload(token || "")
    return String(payload.role || "").toLowerCase()
  }, [])

  const canGenerate = ["teacher", "professor", "admin"].includes(userRole)

  async function previewQuestions() {
    if (!topic.trim()) {
      setError("Informe um tema antes de gerar a previa.")
      return
    }

    try {
      setBusy(true)
      setError("")
      setStatus("Gerando previa com 3 questoes...")
      const response = await api.post("/activities/preview", {
        topic,
        className,
        difficulty,
        schoolYear
      })
      setDraft(response.data)
      setStatus("Previa gerada. Revise e publique se concordar.")
    } catch (err) {
      if (isNetworkUnavailable(err)) {
        setError("Backend indisponivel. Inicie a API para gerar previa.")
      } else {
        setError(err?.response?.data?.error || "Erro ao gerar previa.")
      }
      setStatus("")
    } finally {
      setBusy(false)
    }
  }

  async function publishDraft() {
    if (!draft?.questions?.length) {
      setError("Gere uma previa primeiro.")
      return
    }

    try {
      setBusy(true)
      setError("")
      setStatus("Publicando atividade aprovada...")
      await api.post("/activities/generate", {
        topic: draft.topic,
        className: draft.className || className,
        difficulty: draft.difficulty,
        schoolYear: draft.schoolYear,
        questions: draft.questions
      })
      setStatus("Atividade publicada com sucesso.")
      setDraft(null)
      await loadMine()
    } catch (err) {
      if (isNetworkUnavailable(err)) {
        setError("Backend indisponivel. Inicie a API para publicar atividade.")
      } else {
        setError(err?.response?.data?.error || "Erro ao publicar atividade.")
      }
      setStatus("")
    } finally {
      setBusy(false)
    }
  }

  async function loadMine() {
    try {
      setBusy(true)
      setError("")
      setStatus("Carregando minhas atividades...")
      const response = await api.get("/activities")
      setActivities(response.data)
      setStatus("Minhas atividades atualizadas.")
    } catch (err) {
      if (isNetworkUnavailable(err)) {
        setError("Backend indisponivel. Inicie a API para listar atividades.")
      } else {
        setError(err?.response?.data?.error || "Erro ao carregar atividades.")
      }
      setStatus("")
    } finally {
      setBusy(false)
    }
  }

  async function loadStats() {
    try {
      setBusy(true)
      setError("")
      setStatus("Carregando dashboard de desempenho...")
      const response = await api.get("/activities/teacher/stats")
      setStats(response.data)
      setStatus("Dashboard atualizado.")
    } catch (err) {
      if (isNetworkUnavailable(err)) {
        setError("Backend indisponivel. Inicie a API para ver estatisticas.")
      } else {
        setError(err?.response?.data?.error || "Erro ao carregar estatisticas.")
      }
      setStatus("")
    } finally {
      setBusy(false)
    }
  }

  async function removeActivity(activityId) {
    try {
      setBusy(true)
      setError("")
      setStatus("Apagando atividade...")
      await api.delete(`/activities/${activityId}`)
      setStatus("Atividade apagada.")
      await loadMine()
      if (stats) await loadStats()
    } catch (err) {
      if (isNetworkUnavailable(err)) {
        setError("Backend indisponivel. Inicie a API para apagar atividade.")
      } else {
        setError(err?.response?.data?.error || "Erro ao apagar atividade.")
      }
      setStatus("")
    } finally {
      setBusy(false)
    }
  }

  function logout() {
    localStorage.removeItem("token")
    setAuth(false)
  }

  return (
    <main className="dashboard-shell">
      <section className="dashboard-card">
        <div className="dashboard-header">
          <div>
            <p className="auth-badge">EduFlow</p>
            <h2>Painel do Professor</h2>
            <p className="auth-subtitle">
              Gestao da turma, geracao de questoes e acompanhamento pedagogico.
            </p>
          </div>
          <button className="ghost-btn" onClick={logout}>
            Sair
          </button>
        </div>

        <section className="generator-panel">
          <div className="teacher-fields teacher-fields-prof">
            <label className="field">
              Tema
              <input
                value={topic}
                placeholder="Ex.: Revolucao Industrial"
                onChange={(e) => setTopic(e.target.value)}
                disabled={!canGenerate || busy}
              />
            </label>
            <label className="field">
              Nome da turma
              <input
                value={className}
                placeholder="Ex.: 1A - Manha"
                onChange={(e) => setClassName(e.target.value)}
                disabled={!canGenerate || busy}
              />
            </label>
            <label className="field">
              Nivel
              <select
                value={difficulty}
                onChange={(e) => setDifficulty(e.target.value)}
                disabled={!canGenerate || busy}
              >
                {difficultyOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              Serie
              <select
                value={schoolYear}
                onChange={(e) => setSchoolYear(e.target.value)}
                disabled={!canGenerate || busy}
              >
                {schoolYearOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="teacher-actions">
            <button className="cta" onClick={previewQuestions} disabled={!canGenerate || busy}>
              Gerar previa
            </button>
            <button className="secondary-btn" onClick={previewQuestions} disabled={!canGenerate || busy}>
              Gerar de novo
            </button>
            <button className="secondary-btn" onClick={publishDraft} disabled={!canGenerate || busy}>
              OK, publicar
            </button>
            <button className="secondary-btn" onClick={loadMine} disabled={busy}>
              Minhas atividades
            </button>
            <button className="secondary-btn" onClick={loadStats} disabled={busy}>
              Dashboard turma
            </button>
          </div>
        </section>

        {error ? <p className="message message-error">{error}</p> : null}
        {status ? <p className="message message-success">{status}</p> : null}

        {draft ? (
          <section className="stats-box">
            <h3>Previa da Atividade</h3>
            <p className="auth-subtitle">
              Turma: {draft.className || className} | Tema: {draft.topic} | Nível:{" "}
              {formatDifficulty(draft.difficulty)} | Série: {formatSchoolYear(draft.schoolYear)}
            </p>
            <div className="questions">
              {draft.questions.map((q) => (
                <div key={q.id} className="question-block">
                  <p className="question-title">{q.text}</p>
                  {q.options.map((option, idx) => (
                    <p key={`${q.id}-${idx}`}>
                      {String.fromCharCode(65 + idx)}) {option}
                    </p>
                  ))}
                </div>
              ))}
            </div>
          </section>
        ) : null}

        {stats ? (
          <section className="stats-box">
            <h3>Desempenho da Turma</h3>
            <p className="auth-subtitle">
              Turma: {className} | Atividades: {stats.activitiesCount} | Alunos com respostas:{" "}
              {stats.studentsCount}
            </p>
            {stats.students?.length ? (
              <div className="stats-table-pro">
                <div className="stats-head-row">
                  <div className="stats-head">Aluno</div>
                  <div className="stats-head">Acertos</div>
                  <div className="stats-head">Taxa</div>
                  <div className="stats-head">Dificuldade</div>
                  <div className="stats-head">Dica de atencao</div>
                </div>
                {stats.students.map((student) => (
                  <div className="stats-row-pro" key={student.studentId}>
                    <div className="stats-cell">{student.studentName}</div>
                    <div className="stats-cell">
                      {student.correctAnswers}/{student.totalAnswers}
                    </div>
                    <div className="stats-cell">{student.accuracy}%</div>
                    <div className="stats-cell">{formatDifficulty(student.weakestDifficulty)}</div>
                    <div className="stats-cell">{buildAttentionTip(student)}</div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="empty-state">Ainda nao ha respostas de alunos.</p>
            )}
          </section>
        ) : null}

        <section className="activity-list">
          {activities.length === 0 ? (
            <p className="empty-state">Nenhuma atividade ainda.</p>
          ) : (
            activities.map((activity) => (
              <article key={activity.id} className="activity-item">
                <h3>{activity.title}</h3>
                <p className="activity-meta">
                  Turma: {activity.mcq?.className || className} | Nível:{" "}
                  {formatDifficulty(activity.mcq?.difficulty)} | Série:{" "}
                  {formatSchoolYear(activity.mcq?.schoolYear)}
                </p>
                <button
                  className="ghost-btn delete-btn"
                  onClick={() => removeActivity(activity.id)}
                  disabled={busy}
                >
                  Apagar atividade
                </button>
              </article>
            ))
          )}
        </section>
      </section>
    </main>
  )
}
