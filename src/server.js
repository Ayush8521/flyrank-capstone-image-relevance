const express = require("express");
require("dotenv").config();

const app = express();

app.use(express.json());

app.get("/", (req, res) => {
    res.json({
        name: "AI Image Understanding & Content Matching Engine",
        status: "running"
    });
});

app.get("/health", (req, res) => {
    res.json({
        status: "ok"
    });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});