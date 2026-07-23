'use strict';

require('dotenv').config();
const { createApp } = require('./app');

const port = Number(process.env.BACKEND_PORT) || 8080;
const app = createApp();

app.listen(port, () => {
  // eslint-disable-next-line no-console
  console.log(`StudyPilot backend listening on port ${port}`);
});
