// src/database.js
const mongoose = require('mongoose');
let url ="mongodb+srv://umanlink61:iec2LHD1LbBHJpko@cluster0.3c4rryz.mongodb.net/DB2?retryWrites=true&w=majority&appName=Cluster0"
const connectDB = async () => {
  try {
    await mongoose.connect(url);
    console.log('MongoDB connected');
  } catch (error) {
    console.error('Database connection error:', error);
    process.exit(1); // Exit process with failure
  }
};

module.exports = connectDB;
