const prisma = require("../prisma/client")

const useMockOnly = process.env.ACTIVITY_PROVIDER === "mock" || !process.env.DATABASE_URL
const mockActivitiesByUser = new Map()
const mockAttemptsByActivity = new Map()
let mockNextId = 1

const TEACHER_ROLES = new Set(["teacher", "professor", "admin"])
const STUDENT_ROLES = new Set(["student", "aluno"])
const DIFFICULTIES = ["easy", "medium", "hard"]
const SERIES = [
  "6_ano_fundamental",
  "7_ano_fundamental",
  "8_ano_fundamental",
  "9_ano_fundamental",
  "1_ano_medio",
  "2_ano_medio",
  "3_ano_medio"
]

function getUserId(req) {
  return Number(req.user?.id || 0)
}

function isTeacher(req) {
  return TEACHER_ROLES.has(String(req.user?.role || "").toLowerCase())
}

function isStudent(req) {
  return STUDENT_ROLES.has(String(req.user?.role || "").toLowerCase())
}

function safeJsonParse(value, fallback = null) {
  try {
    return JSON.parse(value)
  } catch {
    return fallback
  }
}

function randomFrom(items) {
  return items[Math.floor(Math.random() * items.length)]
}

function shuffleArray(items) {
  const arr = [...items]
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return arr
}

function shuffleOptionsAndFixCorrectIndex(question) {
  const optionsWithIndex = question.options.map((option, index) => ({ option, index }))
  const shuffled = shuffleArray(optionsWithIndex)
  const correctIndex = shuffled.findIndex((item) => item.index === question.correctIndex)
  return {
    ...question,
    options: shuffled.map((item) => item.option),
    correctIndex
  }
}

function validateDifficultyAndSeries(difficulty, schoolYear) {
  if (!DIFFICULTIES.includes(difficulty)) {
    return "Nivel invalido. Use easy, medium ou hard."
  }
  if (!SERIES.includes(schoolYear)) {
    return "Serie invalida."
  }
  return ""
}

function formatSeriesLabel(schoolYear) {
  return schoolYear
    .replaceAll("_", " ")
    .replace("ano", "ano")
}

function makeQuestionPack(topic, difficulty, schoolYear) {
  const context = `${topic} para ${formatSeriesLabel(schoolYear)}`

  const packs = {
    easy: [
      {
        text: `No tema ${context}, qual alternativa apresenta a ideia principal?`,
        options: [
          `Explica o conceito basico de ${topic} em linguagem simples.`,
          "Mistura assuntos sem relacao com o tema.",
          "Foca em memorizar palavras sem entender significado.",
          "Apresenta apenas opinioes sem fundamento."
        ],
        correctIndex: 0
      },
      {
        text: `Qual exemplo abaixo se conecta melhor a ${topic} no dia a dia dos estudantes?`,
        options: [
          "Um exemplo sem relacao com a escola.",
          `Uma situacao pratica em que ${topic} aparece na rotina.`,
          "Uma frase copiada sem contexto.",
          "Um fato historico aleatorio."
        ],
        correctIndex: 1
      },
      {
        text: `Qual acao ajuda a aprender ${topic} com mais clareza?`,
        options: [
          "Estudar sem fazer perguntas.",
          "Decorar sem revisar exemplos.",
          `Relacionar ${topic} com exemplos da comunidade escolar.`,
          "Ignorar duvidas durante a aula."
        ],
        correctIndex: 2
      },
      {
        text: `Qual atitude mostra participacao ativa ao estudar ${context}?`,
        options: [
          "Relacionar o tema com exemplos simples da realidade da turma.",
          "Ignorar exemplos para terminar mais rapido.",
          "Evitar qualquer pergunta durante a aula.",
          "Memorizar frases sem entender."
        ],
        correctIndex: 0
      },
      {
        text: `Ao revisar ${topic}, qual alternativa melhora a aprendizagem inicial?`,
        options: [
          "Copiar respostas sem interpretar.",
          "Explicar o conteudo com palavras proprias e exemplos.",
          "Ler apenas titulos sem aprofundar.",
          "Responder de forma aleatoria."
        ],
        correctIndex: 1
      }
    ],
    medium: [
      {
        text: `Ao estudar ${context}, qual estrategia mostra boa compreensao?`,
        options: [
          "Repetir definicoes sem analisar aplicacoes.",
          `Comparar dois cenarios e explicar como ${topic} aparece em cada um.`,
          "Escolher respostas sem justificar.",
          "Usar apenas uma fonte sem verificar confiabilidade."
        ],
        correctIndex: 1
      },
      {
        text: `Qual alternativa representa uma aplicacao correta de ${topic}?`,
        options: [
          "Usar dados sem interpretar resultados.",
          "Copiar conclusoes de colegas sem discutir.",
          `Aplicar ${topic} para resolver um problema de sala e justificar a escolha.`,
          "Evitar conectar teoria e pratica."
        ],
        correctIndex: 2
      },
      {
        text: `Para argumentar sobre ${topic}, qual postura e mais adequada?`,
        options: [
          "Usar exemplos reais e explicar relacoes de causa e efeito.",
          "Apenas repetir a pergunta do enunciado.",
          "Ignorar pontos de vista diferentes.",
          "Selecionar respostas ao acaso."
        ],
        correctIndex: 0
      },
      {
        text: `Qual escolha indica aplicacao adequada de ${topic} em atividade de sala?`,
        options: [
          "Selecionar exemplos sem relacao com os objetivos.",
          "Usar um unico argumento sem dados.",
          "Conectar teoria, exemplo e justificativa em sequencia logica.",
          "Evitar comparar alternativas."
        ],
        correctIndex: 2
      },
      {
        text: `Para consolidar ${context}, qual estrategia e mais efetiva?`,
        options: [
          "Construir uma explicacao com evidencia e contraexemplo.",
          "Memorizar respostas prontas sem adaptacao.",
          "Resumir apenas palavras-chave isoladas.",
          "Ignorar contexto historico e social."
        ],
        correctIndex: 0
      }
    ],
    hard: [
      {
        text: `Considerando ${context}, qual alternativa apresenta analise critica mais robusta?`,
        options: [
          "Aceitar uma unica explicacao sem confronto de dados.",
          `Avaliar evidencias, limites e impactos de ${topic} em diferentes cenarios.`,
          "Memorizar termos tecnicos sem interpretar.",
          "Priorizar conclusoes rapidas sem verificacao."
        ],
        correctIndex: 1
      },
      {
        text: `Em uma situacao-problema sobre ${topic}, qual decisao demonstra maior profundidade?`,
        options: [
          "Escolher a primeira alternativa plausivel.",
          "Desconsiderar variaveis sociais e educacionais.",
          "Separar fatos de opinioes e justificar escolhas com evidencias.",
          "Analisar apenas um indicador isolado."
        ],
        correctIndex: 2
      },
      {
        text: `Qual proposta indica dominio avancado de ${topic} para a serie informada?`,
        options: [
          "Conectar conceitos, avaliar consequencias e propor melhoria aplicavel.",
          "Repetir um exemplo pronto sem adaptacao.",
          "Focar apenas em definicao literal.",
          "Ignorar contraexemplos relevantes."
        ],
        correctIndex: 0
      },
      {
        text: `Em um debate sobre ${context}, qual acao representa analise avancada?`,
        options: [
          "Escolher argumento popular sem checagem.",
          "Cruzar dados, apontar limites e propor intervencao justificavel.",
          "Manter apenas opinioes pessoais.",
          "Descartar evidencias divergentes."
        ],
        correctIndex: 1
      },
      {
        text: `Para resolver um caso complexo envolvendo ${topic}, qual caminho e mais robusto?`,
        options: [
          "Aplicar formula pronta sem validar contexto.",
          "Evitar revisao de hipoteses.",
          "Definir criterios, testar alternativas e justificar escolha final.",
          "Priorizar velocidade acima de consistencia."
        ],
        correctIndex: 2
      }
    ]
  }

  const selectedBase = shuffleArray(packs[difficulty]).slice(0, 3)
  const selected = selectedBase.map((q, idx) =>
    shuffleOptionsAndFixCorrectIndex({
    id: `q${idx + 1}`,
    text: q.text,
    options: q.options,
    correctIndex: q.correctIndex,
    difficulty
  }))

  return {
    type: "mcq",
    topic,
    difficulty,
    schoolYear,
    version: randomFrom(["A", "B", "C", "D"]) + Date.now().toString().slice(-4),
    questions: selected
  }
}

function toStoredActivityPayload(topic, difficulty, schoolYear, questions) {
  const mcq = {
    type: "mcq",
    topic,
    difficulty,
    schoolYear,
    questions
  }
  return JSON.stringify(mcq)
}

function parseGenerationInput(body) {
  const topic = String(body?.topic || "").trim()
  const difficulty = String(body?.difficulty || "medium").trim()
  const schoolYear = String(body?.schoolYear || "1_ano_medio").trim()
  return { topic, difficulty, schoolYear }
}

function validateQuestions(questions) {
  if (!Array.isArray(questions) || questions.length !== 3) {
    return "Atividade deve conter exatamente 3 questoes."
  }
  for (let idx = 0; idx < questions.length; idx += 1) {
    const q = questions[idx]
    if (!q?.id || !q?.text || !Array.isArray(q?.options) || q.options.length < 2) {
      return `Questao ${idx + 1} invalida.`
    }
    if (!Number.isInteger(q.correctIndex) || q.correctIndex < 0 || q.correctIndex >= q.options.length) {
      return `Questao ${idx + 1} sem resposta correta valida.`
    }
  }
  return ""
}

function toPublicQuestions(questions) {
  return questions.map((q) => ({
    id: q.id,
    text: q.text,
    options: q.options,
    difficulty: q.difficulty
  }))
}

function normalizeActivity(item) {
  const parsed = typeof item.content === "string" ? safeJsonParse(item.content) : null
  if (parsed?.type === "mcq" && Array.isArray(parsed.questions)) {
    return {
      ...item,
      mcq: {
        topic: parsed.topic || item.title,
        difficulty: parsed.difficulty || "medium",
        schoolYear: parsed.schoolYear || "1_ano_medio",
        questions: parsed.questions
      }
    }
  }
  return {
    ...item,
    mcq: {
      topic: item.title,
      difficulty: "medium",
      schoolYear: "1_ano_medio",
      questions: []
    }
  }
}

function createMockActivity({ title, content, userId }) {
  const activity = {
    id: mockNextId++,
    title,
    content,
    userId,
    createdAt: new Date().toISOString()
  }
  const list = mockActivitiesByUser.get(userId) || []
  list.unshift(activity)
  mockActivitiesByUser.set(userId, list)
  return activity
}

async function createActivity({ title, content, userId }) {
  if (useMockOnly) {
    return createMockActivity({ title, content, userId })
  }

  try {
    return await prisma.activity.create({ data: { title, content, userId } })
  } catch (error) {
    console.error("Prisma indisponivel em createActivity; usando mock:", error.message)
    return createMockActivity({ title, content, userId })
  }
}

function getMockTeacherActivities(userId) {
  return (mockActivitiesByUser.get(userId) || []).map(normalizeActivity)
}

async function listTeacherActivities(userId) {
  const mockList = getMockTeacherActivities(userId)

  if (useMockOnly) {
    return mockList
  }

  try {
    const dbList = await prisma.activity.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" }
    })
    const normalized = dbList.map(normalizeActivity)
    if (!mockList.length) return normalized
    const dbIds = new Set(normalized.map((a) => a.id))
    return [...mockList.filter((a) => !dbIds.has(a.id)), ...normalized]
  } catch (error) {
    console.error("Prisma indisponivel em listTeacherActivities; usando mock:", error.message)
    return mockList
  }
}

function getAllMockActivities() {
  return [...mockActivitiesByUser.values()]
    .flat()
    .map(normalizeActivity)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
}

async function listPublicActivities() {
  const mockList = getAllMockActivities()

  if (useMockOnly) {
    return mockList
  }

  try {
    const dbList = await prisma.activity.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        user: {
          select: { id: true, name: true, role: true, email: true }
        }
      }
    })
    const normalized = dbList.map(normalizeActivity)
    if (!mockList.length) return normalized
    const dbIds = new Set(normalized.map((a) => a.id))
    return [...mockList.filter((a) => !dbIds.has(a.id)), ...normalized]
  } catch (error) {
    console.error("Prisma indisponivel em listPublicActivities; usando mock:", error.message)
    return mockList
  }
}

function sanitizeForPublic(activity) {
  return {
    id: activity.id,
    title: activity.title,
    userId: activity.userId,
    user: activity.user || null,
    createdAt: activity.createdAt,
    mcq: {
      topic: activity.mcq.topic,
      difficulty: activity.mcq.difficulty,
      schoolYear: activity.mcq.schoolYear,
      questions: toPublicQuestions(activity.mcq.questions)
    }
  }
}

function getActivityFromAll(allActivities, id) {
  return allActivities.find((a) => Number(a.id) === Number(id))
}

function evaluateAttempt(activity, answers) {
  const questions = activity.mcq.questions
  let correct = 0
  const detail = questions.map((q) => {
    const selected = Number(answers[q.id])
    const isCorrect = selected === Number(q.correctIndex)
    if (isCorrect) correct += 1
    return {
      questionId: q.id,
      selectedIndex: Number.isFinite(selected) ? selected : -1,
      correctIndex: q.correctIndex,
      isCorrect,
      difficulty: q.difficulty
    }
  })
  return { correct, total: questions.length, detail }
}

function saveMockAttempt(activityId, student, result) {
  const key = Number(activityId)
  const list = mockAttemptsByActivity.get(key) || []
  list.push({
    attemptId: `${key}-${student.id}-${Date.now()}`,
    studentId: student.id,
    studentName: student.name,
    studentEmail: student.email,
    correct: result.correct,
    total: result.total,
    detail: result.detail,
    submittedAt: new Date().toISOString()
  })
  mockAttemptsByActivity.set(key, list)
}

function collectStudentHistory(studentId, allActivities) {
  const activityById = new Map(allActivities.map((a) => [Number(a.id), a]))
  const history = []

  for (const [activityId, attempts] of mockAttemptsByActivity.entries()) {
    const activity = activityById.get(Number(activityId))
    if (!activity) continue
    for (const attempt of attempts) {
      if (Number(attempt.studentId) !== Number(studentId)) continue
      history.push({
        attemptId: attempt.attemptId,
        activityId: Number(activityId),
        activityTitle: activity.title,
        submittedAt: attempt.submittedAt,
        correctAnswers: attempt.correct,
        totalQuestions: attempt.total,
        score: Number(((attempt.correct / attempt.total) * 100).toFixed(1)),
        detail: attempt.detail
      })
    }
  }

  history.sort((a, b) => new Date(b.submittedAt) - new Date(a.submittedAt))
  return history
}

function removeMockActivityForTeacher(activityId, teacherId) {
  const list = mockActivitiesByUser.get(teacherId) || []
  const before = list.length
  const remaining = list.filter((a) => Number(a.id) !== Number(activityId))
  mockActivitiesByUser.set(teacherId, remaining)
  mockAttemptsByActivity.delete(Number(activityId))
  return before !== remaining.length
}

async function deleteActivityForTeacher(activityId, teacherId) {
  if (useMockOnly) {
    return removeMockActivityForTeacher(activityId, teacherId)
  }

  try {
    const target = await prisma.activity.findUnique({ where: { id: Number(activityId) } })
    if (!target || Number(target.userId) !== Number(teacherId)) {
      return false
    }
    await prisma.activity.delete({ where: { id: Number(activityId) } })
    mockAttemptsByActivity.delete(Number(activityId))
    return true
  } catch (error) {
    console.error("Prisma indisponivel em deleteActivityForTeacher; usando mock:", error.message)
    return removeMockActivityForTeacher(activityId, teacherId)
  }
}

function collectTeacherStats(teacherActivities) {
  const myActivityIds = new Set(teacherActivities.map((a) => Number(a.id)))
  const byStudent = new Map()

  for (const [activityId, attempts] of mockAttemptsByActivity.entries()) {
    if (!myActivityIds.has(Number(activityId))) continue
    const latestByStudent = new Map()
    for (const attempt of attempts) {
      const previous = latestByStudent.get(attempt.studentId)
      if (!previous || new Date(attempt.submittedAt) > new Date(previous.submittedAt)) {
        latestByStudent.set(attempt.studentId, attempt)
      }
    }

    for (const attempt of latestByStudent.values()) {
      const key = attempt.studentId
      const item = byStudent.get(key) || {
        studentId: attempt.studentId,
        studentName: attempt.studentName || attempt.studentEmail || `Aluno ${attempt.studentId}`,
        studentEmail: attempt.studentEmail || "",
        totalAnswers: 0,
        correctAnswers: 0,
        difficulty: {
          easy: { correct: 0, total: 0 },
          medium: { correct: 0, total: 0 },
          hard: { correct: 0, total: 0 }
        }
      }

      item.totalAnswers += attempt.total
      item.correctAnswers += attempt.correct
      for (const d of attempt.detail) {
        if (!DIFFICULTIES.includes(d.difficulty)) continue
        item.difficulty[d.difficulty].total += 1
        if (d.isCorrect) item.difficulty[d.difficulty].correct += 1
      }
      byStudent.set(key, item)
    }
  }

  return [...byStudent.values()].map((row) => {
    const accuracy = row.totalAnswers > 0 ? (row.correctAnswers / row.totalAnswers) * 100 : 0
    const difficultySummary = DIFFICULTIES.map((level) => {
      const d = row.difficulty[level]
      const rate = d.total > 0 ? (d.correct / d.total) * 100 : 0
      return { level, correct: d.correct, total: d.total, rate: Number(rate.toFixed(1)) }
    })
    difficultySummary.sort((a, b) => a.rate - b.rate)
    return {
      studentId: row.studentId,
      studentName: row.studentName,
      studentEmail: row.studentEmail,
      totalAnswers: row.totalAnswers,
      correctAnswers: row.correctAnswers,
      accuracy: Number(accuracy.toFixed(1)),
      weakestDifficulty: difficultySummary[0]?.level || "n/a",
      difficultySummary
    }
  })
}

exports.generate = async (req, res) => {
  try {
    if (!isTeacher(req)) {
      return res.status(403).json({ error: "Apenas professores podem gerar atividades" })
    }

    const { topic, difficulty, schoolYear } = parseGenerationInput(req.body)
    if (!topic) {
      return res.status(400).json({ error: "Tema obrigatorio" })
    }
    const validationError = validateDifficultyAndSeries(difficulty, schoolYear)
    if (validationError) {
      return res.status(400).json({ error: validationError })
    }

    const questions = req.body?.questions
    const questionsError = validateQuestions(questions)
    if (questionsError) {
      return res.status(400).json({ error: questionsError })
    }

    const content = toStoredActivityPayload(topic, difficulty, schoolYear, questions)
    const userId = getUserId(req)
    const activity = await createActivity({ title: topic, content, userId })
    const normalized = normalizeActivity(activity)

    return res.json(sanitizeForPublic(normalized))
  } catch (error) {
    console.error("Erro ao gerar atividade:", error)
    return res.status(500).json({ error: "Erro ao gerar atividade" })
  }
}

exports.preview = async (req, res) => {
  try {
    if (!isTeacher(req)) {
      return res.status(403).json({ error: "Apenas professores podem gerar atividades" })
    }

    const { topic, difficulty, schoolYear } = parseGenerationInput(req.body)
    if (!topic) {
      return res.status(400).json({ error: "Tema obrigatorio" })
    }
    const validationError = validateDifficultyAndSeries(difficulty, schoolYear)
    if (validationError) {
      return res.status(400).json({ error: validationError })
    }

    const mcq = makeQuestionPack(topic, difficulty, schoolYear)
    return res.json({
      topic: mcq.topic,
      difficulty: mcq.difficulty,
      schoolYear: mcq.schoolYear,
      version: mcq.version,
      questions: mcq.questions
    })
  } catch (error) {
    console.error("Erro ao gerar previa:", error)
    return res.status(500).json({ error: "Erro ao gerar previa" })
  }
}

exports.list = async (req, res) => {
  try {
    const userId = getUserId(req)
    const activities = await listTeacherActivities(userId)
    return res.json(activities.map(sanitizeForPublic))
  } catch (error) {
    console.error("Erro ao listar atividades:", error)
    return res.status(500).json({ error: "Erro ao listar atividades" })
  }
}

exports.publicList = async (_req, res) => {
  try {
    const activities = await listPublicActivities()
    return res.json(activities.map(sanitizeForPublic))
  } catch (error) {
    console.error("Erro ao listar atividades publicas:", error)
    return res.status(500).json({ error: "Erro ao listar atividades publicas" })
  }
}

exports.submitAnswers = async (req, res) => {
  try {
    if (!isStudent(req)) {
      return res.status(403).json({ error: "Apenas alunos podem responder atividades" })
    }

    const activityId = Number(req.params.id)
    const answers = req.body?.answers || {}
    if (!Number.isFinite(activityId)) {
      return res.status(400).json({ error: "Atividade invalida" })
    }

    const allActivities = await listPublicActivities()
    const activity = getActivityFromAll(allActivities, activityId)
    if (!activity) {
      return res.status(404).json({ error: "Atividade nao encontrada" })
    }
    if (!activity.mcq.questions.length) {
      return res.status(400).json({ error: "Atividade sem questoes de multipla escolha" })
    }

    const result = evaluateAttempt(activity, answers)
    const student = {
      id: getUserId(req),
      name: req.user?.name || req.user?.email || `Aluno ${getUserId(req)}`,
      email: req.user?.email || ""
    }
    saveMockAttempt(activityId, student, result)

    const questionResults = activity.mcq.questions.map((q) => {
      const detail = result.detail.find((d) => d.questionId === q.id)
      return {
        questionId: q.id,
        text: q.text,
        options: q.options,
        selectedIndex: detail?.selectedIndex ?? -1,
        correctIndex: detail?.correctIndex ?? q.correctIndex,
        isCorrect: Boolean(detail?.isCorrect)
      }
    })

    return res.json({
      activityId,
      correctAnswers: result.correct,
      totalQuestions: result.total,
      score: Number(((result.correct / result.total) * 100).toFixed(1)),
      questionResults
    })
  } catch (error) {
    console.error("Erro ao enviar respostas:", error)
    return res.status(500).json({ error: "Erro ao enviar respostas" })
  }
}

exports.teacherStats = async (req, res) => {
  try {
    if (!isTeacher(req)) {
      return res.status(403).json({ error: "Apenas professores podem ver o dashboard" })
    }

    const userId = getUserId(req)
    const teacherActivities = await listTeacherActivities(userId)
    const perStudent = collectTeacherStats(teacherActivities)

    return res.json({
      activitiesCount: teacherActivities.length,
      studentsCount: perStudent.length,
      students: perStudent
    })
  } catch (error) {
    console.error("Erro ao carregar estatisticas:", error)
    return res.status(500).json({ error: "Erro ao carregar estatisticas" })
  }
}

exports.studentHistory = async (req, res) => {
  try {
    if (!isStudent(req)) {
      return res.status(403).json({ error: "Apenas alunos podem ver historico" })
    }
    const allActivities = await listPublicActivities()
    const history = collectStudentHistory(getUserId(req), allActivities)
    return res.json({ attempts: history })
  } catch (error) {
    console.error("Erro ao carregar historico do aluno:", error)
    return res.status(500).json({ error: "Erro ao carregar historico do aluno" })
  }
}

exports.remove = async (req, res) => {
  try {
    if (!isTeacher(req)) {
      return res.status(403).json({ error: "Apenas professores podem apagar atividades" })
    }
    const activityId = Number(req.params.id)
    if (!Number.isFinite(activityId)) {
      return res.status(400).json({ error: "Atividade invalida" })
    }
    const removed = await deleteActivityForTeacher(activityId, getUserId(req))
    if (!removed) {
      return res.status(404).json({ error: "Atividade nao encontrada" })
    }
    return res.json({ success: true })
  } catch (error) {
    console.error("Erro ao remover atividade:", error)
    return res.status(500).json({ error: "Erro ao remover atividade" })
  }
}
