require("dotenv").config();
const jwt = require("jsonwebtoken");
const jwtKey = process.env.JWTKEY;

function authenticateToken(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return res.status(401).json({
      message: "token required",
    });
  }

  const token = authHeader.split(" ")[1];

  jwt.verify(token, jwtKey, (err, decoded) => {
    if (err) {
      return res.status(403).json({ message: "invalid token" });
    }

    req.user = decoded;

    next();
  });
}

module.exports = authenticateToken