const express = require("express");
const path = require("path");
require("dotenv").config();
const cors = require("cors");
const connectDB = require("./config/db");
const projectRoutes = require("./routes/projects");
const dashboardRoutes = require("./routes/dashboardRoutes");

const app = express();

// Middleware
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ limit: "10mb", extended: true }));
app.use(cors());

// API Routes
app.use("/api/projects", projectRoutes);
app.use("/api", dashboardRoutes);

// Test API
app.get("/api/projects-test", (req, res) => {
  res.json({
    success: true,
    message: "Projects route is working!"
  });
});

// Serve Frontend & Admin Static Files
const frontendPath = path.join(__dirname, "../Frontend");
const adminPath = path.join(__dirname, "../Admin");

app.use(express.static(frontendPath));
app.use("/admin", express.static(adminPath));
app.use("/Admin", express.static(adminPath));

// Routes for Main Page & Admin Login
app.get("/", (req, res) => {
  res.sendFile(path.join(frontendPath, "index.html"));
});

app.get("/admin", (req, res) => {
  res.redirect("/admin/login.html");
});

// Connect Database
connectDB();

// Start Server Locally
const PORT = process.env.PORT || 5000;
if (!process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

module.exports = app;
