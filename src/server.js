const express = require("express");
const cors = require("cors");
require("dotenv").config();
const cookieParser = require('cookie-parser');
const authRoutes = require('./routes/authRoutes');
const pool = require("./config/db");

const app = express();

app.use(cors({
  origin: 'http://localhost:5173',
  credentials: true,
}));
app.use(cookieParser());
app.use(express.json());

app.use('/api/auth', authRoutes);

app.get("/", (req, res) => {
  res.send("Internship Management Portal API is running!");
});

app.get("/api/test-db", async (req, res) => {
  try {
    const [rows] = await pool.query("SELECT 1 AS result");
    res.json({ message: "Database connected successfully!", data: rows });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Database connection failed" });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});