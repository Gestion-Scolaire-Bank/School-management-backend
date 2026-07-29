require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const routes = require('./routes');

const app = express();
app.use(helmet());
app.use(cors());
app.use(morgan('dev'));
app.use(express.json());

app.get('/health', (req, res) => res.json({ status: 'UP', service: 'presence-service' }));

app.use('/', routes);

const PORT = process.env.PORT || 8084;
app.listen(PORT, () => console.log(`presence-service demarre sur le port ${PORT}`));

module.exports = app;
