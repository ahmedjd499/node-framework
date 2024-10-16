
// src/index.js or src/app.js
const express = require('express');
const cors = require("cors");
const dotenv = require("dotenv");
const connectDB = require('./configs/database'); // Import database connection

const app = express();
app.use(cors());

const PORT = process.env.PORT || 3000;

// Middleware to parse JSON request bodies
app.use(express.json());

// Connect to the database
connectDB();

// Use the post routes

// Start the server

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
