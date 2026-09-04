require("dotenv").config();

const express = require("express");
const pool = require("./config/db");
const imageRoutes = require("./routes/images");

const app = express();

const PORT = process.env.PORT || 5000;

app.use(express.json());

app.get("/", (req, res) => {
  res.json({
    name: "AI Image Relevance Engine",
    version: "1.0.0",
    status: "running",
  });
});

app.get("/health", async (req, res) => {
  try {
    const result = await pool.query("SELECT NOW()");

    res.json({
      status: "ok",
      database: "connected",
      time: result.rows[0].now,
    });
  } catch (error) {
    console.error("Database health check failed:", error);

    res.status(500).json({
      status: "error",
      database: "disconnected",
    });
  }
});

app.use("/api/images", imageRoutes);
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});