const bcrypt = require("bcryptjs")
const jwt = require("jsonwebtoken")
const prisma = require("../prisma/client")

const JWT_SECRET = process.env.JWT_SECRET || "teste_secret"

function buildToken(user) {
  return jwt.sign(
    { id: user.id, email: user.email, role: user.role },
    JWT_SECRET,
    { expiresIn: "1d" }
  )
}

async function register(req, res) {
  try {
    const { name, email, password, role } = req.body

    if (!name || !email || !password) {
      return res.status(400).json({ error: "name, email e password sao obrigatorios" })
    }

    const existingUser = await prisma.user.findUnique({ where: { email } })
    if (existingUser) {
      return res.status(409).json({ error: "Email ja cadastrado" })
    }

    const hashedPassword = await bcrypt.hash(password, 10)

    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        role: role || "student"
      }
    })

    const token = buildToken(user)
    return res.status(201).json({ token })
  } catch (error) {
    console.error("Erro no register:", error)
    return res.status(500).json({ error: "Erro interno no servidor" })
  }
}

async function login(req, res) {
  try {
    const { email, password } = req.body

    if (!email || !password) {
      return res.status(400).json({ error: "Email e password sao obrigatorios" })
    }

    const user = await prisma.user.findUnique({ where: { email } })
    if (!user) {
      return res.status(401).json({ error: "Credenciais invalidas" })
    }

    const passwordMatches = await bcrypt.compare(password, user.password)
    if (!passwordMatches) {
      return res.status(401).json({ error: "Credenciais invalidas" })
    }

    const token = buildToken(user)
    return res.json({ token })
  } catch (error) {
    console.error("Erro no login:", error)
    return res.status(500).json({ error: "Erro interno no servidor" })
  }
}

module.exports = { register, login }
