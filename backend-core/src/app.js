const express = require('express');
const cors = require('cors');
const routes = require('./routes');
const errorHandler = require('./middlewares/errorHandler');

const app = express();

// Global Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Root Route & API Routing
app.use('/api', routes);
app.use('/', routes);

// Global Error Handler
app.use(errorHandler);

module.exports = app;
