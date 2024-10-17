//package importes
const express = require('express');
const cors = require("cors");
const dotenv = require("dotenv");
const path = require('path');
const listEndpoints = require('express-list-endpoints');


// Import database connection
const connectDB = require('./configs/database'); 
// Connect to the database
connectDB();

//routes importes
const clientRoutes = require('./routes/clientRoutes');

const clientViewRoutes = require('./routes/clientViewRoutes');


// end routes importes



const app = express();
app.use(cors());

const PORT = process.env.PORT || 3000;

// Middleware to parse JSON request bodies
app.use(express.json());


// Use the  routes
app.use('/api/client', clientRoutes);

app.use('/client', clientViewRoutes);


//end use routes

// Start the server

const endpoints = listEndpoints(app);
console.log(endpoints);

// Example API docs endpoint to display routes
app.get('/api-docs', (req, res) => {
  res.json(endpoints);
});


app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
