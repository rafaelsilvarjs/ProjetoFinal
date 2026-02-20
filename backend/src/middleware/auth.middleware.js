const jwt = require("jsonwebtoken")

const JWT_SECRET = process.env.JWT_SECRET || "teste_secret"

module.exports = function (req, res, next) {
  const token = req.headers.authorization?.split(" ")[1]

  if (!token) return res.status(401).json({ error: "Token nao fornecido" })

  try {
    const decoded = jwt.verify(token, JWT_SECRET)
    req.user = decoded
    return next()
  } catch {
    return res.status(401).json({ error: "Token invalido" })
  }
}
