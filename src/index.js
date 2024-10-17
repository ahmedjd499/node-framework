//package importes
const express = require('express');
const cors = require("cors");
const dotenv = require("dotenv");
const path = require('path');


// Import database connection
const connectDB = require('./configs/database'); 
// Connect to the database
connectDB();

//routes importes

// end routes importes



const app = express();
app.use(cors());

const PORT = process.env.PORT || 3000;

// Middleware to parse JSON request bodies
app.use(express.json());


// Use the  routes

//end use routes

// Start the server
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
