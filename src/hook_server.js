import express from 'express';
import bodyParser from 'body-parser';
import moment from 'moment';
import _ from 'lodash';

var app = express();
app.use(bodyParser.json()); // for parsing application/json
app.use(bodyParser.urlencoded({ extended: true })); // for parsing application/x-www-form-urlencoded

app.get('/', (req, res) => {
  res.send('Welcome to MUZAK, please use IRC to interact.');
});

app.post('/hooks/commit', (req, res) => {
  var data = {};

  if (_.isObject(req.body)) {
    data = req.body;
  } else {
    data = JSON.parse(req.body.payload);
  }

  _.forEach(data.commits, (commit) => {
    console.log("Commit by:", commit.author.email);
  });

  res.send('hook received succesfully at ' + moment().format());
});

export default app;
