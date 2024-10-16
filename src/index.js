//package importes
const express = require('express');
const cors = require("cors");
const dotenv = require("dotenv");


// Import database connection
const connectDB = require('./configs/database'); 
// Connect to the database
connectDB();

//routes importes
const aaRoutes = require('./routes/aaRoutes');

const dddRoutes = require('./routes/dddRoutes');

const clientRoutes = require('./routes/clientRoutes');


// end routes importes



const app = express();
app.use(cors());

const PORT = process.env.PORT || 3000;

// Middleware to parse JSON request bodies
app.use(express.json());


// Use the  routes
app.use('/api/aa', aaRoutes);

app.use('/api/ddd', dddRoutes);

app.use('/api/client', clientRoutes);



//end use routes

// Start the server
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
