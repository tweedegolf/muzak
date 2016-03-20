import express from 'express';

var app = express();

app.get('/', (req, res) => {
  res.send('Welcome to MUZAK, please use IRC to interact.');
});

app.post('/hooks/commit', (req, res) => {
  console.log('received hook');
  res.send('Hello World');
});

export default app;
