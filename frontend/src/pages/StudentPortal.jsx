import { useEffect, useState } from "react"
import api from "../services/api"

function isNetworkUnavailable(err) {
  return err?.code === "ERR_NETWORK" || !err?.response
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

function optionState(result, optionIndex) {
  if (!result) return ""
  if (optionIndex === result.correctIndex) return "option-correct"
  if (optionIndex === result.selectedIndex && !result.isCorrect) return "option-wrong"
  return "option-neutral"
}

export default function StudentPortal({ setAuth }) {
  const [activities, setActivities] = useState([])
  const [history, setHistory] = useState([])
  const [answersByActivity, setAnswersByActivity] = useState({})
  const [resultByActivity, setResultByActivity] = useState({})
  const [busy, setBusy] = useState(false)
  const [status, setStatus] = useState("")
  const [error, setError] = useState("")

  async function loadPublic() {
    try {
      setBusy(true)
      setError("")
      setStatus("Carregando atividades publicas...")
      const response = await api.get("/activities/public")
      setActivities(response.data)
      setStatus("Conteudos atualizados.")
    } catch (err) {
      if (isNetworkUnavailable(err)) {
        setActivities([])
        setStatus("Backend indisponivel. Inicie a API para responder questoes.")
        return
      }

      setError(err?.response?.data?.error || "Erro ao carregar atividades publicas.")
      setStatus("")
    } finally {
      setBusy(false)
    }
  }

  async function loadHistory() {
    try {
      const response = await api.get("/activities/student/history")
      setHistory(response.data?.attempts || [])
    } catch {
      setHistory([])
    }
  }

  function updateAnswer(activityId, questionId, optionIndex) {
    setAnswersByActivity((prev) => ({
      ...prev,
      [activityId]: {
        ...(prev[activityId] || {}),
        [questionId]: optionIndex
      }
    }))
  }

  async function submitActivity(activity) {
    try {
      setBusy(true)
      setError("")
      const answers = answersByActivity[activity.id] || {}
      const response = await api.post(`/activities/${activity.id}/submit`, { answers })
      setResultByActivity((prev) => ({ ...prev, [activity.id]: response.data }))
      setStatus("Respostas enviadas com sucesso.")
      await loadHistory()
    } catch (err) {
      setError(err?.response?.data?.error || "Erro ao enviar respostas.")
      setStatus("")
    } finally {
      setBusy(false)
    }
  }

  function logout() {
    localStorage.removeItem("token")
    setAuth(false)
  }

  useEffect(() => {
    ;(async () => {
      await loadPublic()
      await loadHistory()
    })()
  }, [])

  return (
    <main className="dashboard-shell">
      <section className="dashboard-card">
        <div className="dashboard-header">
          <div>
            <p className="auth-badge">EduFlow</p>
            <h2>Portal do Aluno</h2>
            <p className="auth-subtitle">
              Responda atividades de multipla escolha e acompanhe seu desempenho.
            </p>
          </div>
          <button className="ghost-btn" onClick={logout}>
            Sair
          </button>
        </div>

        <div className="toolbar toolbar-student">
          <button className="secondary-btn" onClick={loadPublic} disabled={busy}>
            Atualizar atividades
          </button>
          <button className="secondary-btn" onClick={loadHistory} disabled={busy}>
            Atualizar historico
          </button>
        </div>

        {error ? <p className="message message-error">{error}</p> : null}
        {status ? <p className="message message-success">{status}</p> : null}

        <section className="activity-list">
          {activities.length === 0 ? (
            <p className="empty-state">Nenhuma atividade publica encontrada.</p>
          ) : (
            activities.map((activity) => {
              const submission = resultByActivity[activity.id]
              return (
                <article key={activity.id} className="activity-item">
                  <h3>{activity.title}</h3>
                  <p className="activity-meta">
                    Nível: {formatDifficulty(activity.mcq?.difficulty)} | Série:{" "}
                    {formatSchoolYear(activity.mcq?.schoolYear)}
                  </p>
                  <div className="questions">
                    {(activity.mcq?.questions || []).map((q) => {
                      const questionResult = submission?.questionResults?.find(
                        (r) => r.questionId === q.id
                      )
                      return (
                        <div key={q.id} className="question-block">
                          <p className="question-title">{q.text}</p>
                          {q.options.map((option, optionIndex) => (
                            <label
                              key={`${q.id}-${optionIndex}`}
                              className={`option-row ${optionState(questionResult, optionIndex)}`}
                            >
                              <input
                                type="radio"
                                name={`${activity.id}-${q.id}`}
                                checked={answersByActivity[activity.id]?.[q.id] === optionIndex}
                                onChange={() => updateAnswer(activity.id, q.id, optionIndex)}
                                disabled={Boolean(submission)}
                              />
                              <span>{option}</span>
                            </label>
                          ))}
                        </div>
                      )
                    })}
                  </div>
                  <button
                    className="cta submit-btn"
                    onClick={() => submitActivity(activity)}
                    disabled={busy || Boolean(submission)}
                  >
                    {submission ? "Respondida" : "Enviar respostas"}
                  </button>
                  {submission ? (
                    <p className="message message-success">
                      Voce acertou {submission.correctAnswers} de {submission.totalQuestions} (
                      {submission.score}%).
                    </p>
                  ) : null}
                </article>
              )
            })
          )}
        </section>

        <section className="stats-box">
          <h3>Historico de Tentativas</h3>
          {history.length === 0 ? (
            <p className="empty-state">Voce ainda nao respondeu atividades.</p>
          ) : (
            <div className="history-list">
              {history.map((attempt) => (
                <article key={attempt.attemptId} className="history-item">
                  <p>
                    <strong>{attempt.activityTitle}</strong> - {attempt.correctAnswers}/
                    {attempt.totalQuestions} ({attempt.score}%)
                  </p>
                  <p className="activity-meta">
                    {new Date(attempt.submittedAt).toLocaleString("pt-BR")}
                  </p>
                </article>
              ))}
            </div>
          )}
        </section>
      </section>
    </main>
  )
}
