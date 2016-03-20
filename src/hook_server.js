// vi:expandtab sw=4 ts=4

import express from 'express';
import bodyParser from 'body-parser';
import moment from 'moment';
import _ from 'lodash';

var app = express();

const ISSUE_CREATED = 'jira:issue_created';
const ISSUE_UPDATED = 'jira:issue_updated';

 // for parsing application/json
app.use(bodyParser.json());

// for parsing application/x-www-form-urlencoded
app.use(bodyParser.urlencoded({ extended: true }));

app.get('/', (req, res) => {
    res.send('Welcome to MUZAK, please use IRC to interact.');
});

app.post('/commit', (req, res) => {
    var data = {};

    // github has a payload param - gitlab uses the body
    if (req.body.object_kind) {
        // gitlab payload JSON
        data = req.body;
    } else {
        // github payload JSON
        data = JSON.parse(req.body.payload);
    }

    _.forEach(data.commits, (commit) => {
        console.log('Commit by:', commit.author.email);
    });

    res.send('[' + moment().format('YYYY-MM-DD hh:mm') + '] hook processed');
});

app.post('/issue/:key', function (req, res) {
    var data = req.body;

    if (data.webhookEvent === ISSUE_CREATED) {
        console.log('issue created by:', data.user.emailAddress);
    } else if (data.webhookEvent === ISSUE_UPDATED)  {
        var action = 'changed';
        _.forEach(data.changelog.items, (item) => {
            if (item.field === 'status') {
                action = item.toString;
            }
        });
        console.log('issue ' + action + ' by:', data.user.emailAddress);
    }

    res.send('[' + moment().format('YYYY-MM-DD hh:mm') + '] hook processed');
});


export default app;
