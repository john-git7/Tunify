

const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const dotenv = require('dotenv');
dotenv.config();

const authRoutes = require('./routes/authRoutes');  
const musicRoutes = require('./routes/musicRoutes');
const searchRoutes = require('./routes/searchRoutes');
//const playRoutes = require('./routes/playRoutes');


const app = express();


app.use(cors());

app.use(express.json());
app.use(express.urlencoded({ extended: true }));


app.use('/api/auth', authRoutes);
app.use('/api/search', searchRoutes);
app.use('/api/audio', musicRoutes);
//app.use('/api/playlists', playRoutes);


mongoose.connect(process.env.MONGO_URI)
  .then(() => {
    console.log('Connected to MongoDB');
    const PORT = process.env.PORT || 5000;
    app.listen(PORT,"0.0.0.0", () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
  })
  .catch(err => {
    console.error('MongoDB connection failed:', err.message);
  });