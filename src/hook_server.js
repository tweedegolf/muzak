// vi:expandtab sw=4 ts=4

import express from 'express';
import bodyParser from 'body-parser';
import moment from 'moment';
import _ from 'lodash';
import config from '../config';

// initialize express application
var app = express();

const ISSUE_CREATED = 'jira:issue_created';
const ISSUE_UPDATED = 'jira:issue_updated';

// for parsing application/json
app.use(bodyParser.json());

// for parsing application/x-www-form-urlencoded
app.use(bodyParser.urlencoded({ extended: true }));

/**
 * Landing page
 */
app.get('/', (req, res) => {
    res.send('Welcome to MUZAK, please use IRC to interact.');
});

/**
 * Webhook for GitHub or GitLab commit endpoint
 *
 * @see https://developer.github.com/webhooks/
 * @see https://gitlab.com/gitlab-org/gitlab-ce/blob/master/doc/web_hooks/web_hooks.md
 */
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
        app.karma.add(commit.author.email, config.karma.points.commit, 'commit');
    });

    res.send('[' + moment().format('YYYY-MM-DD hh:mm') + '] hook processed');
});

/**
 * Jira endpoint webhook endpoint
 *
 * @see https://developer.atlassian.com/jiradev/jira-apis/webhooks
 */
app.post('/issue/:key', function (req, res) {
    var data = req.body;

    if (data.webhookEvent === ISSUE_CREATED) {
        app.karma.add(commit.author.email, 1, 'issue created');
    } else if (data.webhookEvent === ISSUE_UPDATED)  {
        var action = 'updated';

        _.forEach(data.changelog.items, (item) => {
            if (item.field === 'status') {
                action = item.toString;
            }
        });

        switch (action) {
            case 'closed':
                app.karma.add(data.user.emailAddress, config.karma.points.issue_close, 'issue closed');
                break;
            case 'resolved':
                app.karma.add(data.user.emailAddress, config.karma.points.issue_resolve, 'issue resolved');
                break;
            case 'updated':
                app.karma.add(data.user.emailAddress, config.karma.points.issue_update, 'issue updated');
                break;
            default:
                // no points for other actions
                break;
        }
    }

    res.send('[' + moment().format('YYYY-MM-DD hh:mm') + '] hook processed');
});


export default app;
