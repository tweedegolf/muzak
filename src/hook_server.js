// vi:expandtab sw=4 ts=4

import express from 'express';
import bodyParser from 'body-parser';
import moment from 'moment';
import _ from 'lodash';
import config from '../config';
import {sprintf} from 'sprintf';

const ISSUE_CREATED = 'jira:issue_created';
const ISSUE_UPDATED = 'jira:issue_updated';

/**
 * Endpoint for Jira and GitHub/GitLab webhooks
 */
export default class HookServer {

    /**
     * Server constructor
     *
     * @param ircmpd
     * @param karma
     */
    constructor(ircmpd, karma) {
        this.ircmpd = ircmpd;
        this.karma = karma;

        this.app = express();

        // for parsing application/json
        this.app.use(bodyParser.json());

        // for parsing application/x-www-form-urlencoded
        this.app.use(bodyParser.urlencoded({
            extended: true
        }));

        this.register_hooks();
    }

    /**
     * Register routes as webhook endpoints
     */
    register_hooks() {
        /**
         * Landing page
         */
        this.app.get('/', (req, res) => {
            res.send('Welcome to MUZAK, please use IRC to interact.');
        });

        /**
         * Webhook for GitHub or GitLab commit endpoint
         *
         * @see https://developer.github.com/webhooks/
         * @see https://gitlab.com/gitlab-org/gitlab-ce/blob/master/doc/web_hooks/web_hooks.md
         */
        this.app.post('/commit', (req, res) => {
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
                this.ircmpd.message(sprintf(
                    'Commit by %s in project %s: %s',
                    commit.author.name,
                    data.repository.name,
                    commit.message
                ));
                this.karma.add(commit.author.email, config.karma.points.commit, 'commit');
            });

            res.send('success');
        });

        /**
         * Jira endpoint webhook endpoint
         *
         * @see https://developer.atlassian.com/jiradev/jira-apis/webhooks
         */
        this.app.post('/issue/:key', (req, res) => {
            var data = req.body;

            if (data.webhookEvent === ISSUE_CREATED) {
                this.karma.add(commit.author.email, 1, 'issue created');
                this.ircmpd.message(sprintf(
                    'Issue %s created by %s',
                    data.issue.name,
                    data.user.name
                ));
            } else if (data.webhookEvent === ISSUE_UPDATED)  {
                var action = 'updated';

                _.forEach(data.changelog.items, (item) => {
                    if (item.field === 'status') {
                        action = item.toString;
                    }
                });

                this.ircmpd.message(sprintf(
                    'Issue %s %s by %s',
                    data.issue.key,
                    action,
                    data.user.name
                ));

                switch (action) {
                    case 'closed':
                        this.karma.add(data.user.emailAddress, config.karma.points.issue_close, 'issue closed');
                        break;
                    case 'resolved':
                        this.karma.add(data.user.emailAddress, config.karma.points.issue_resolve, 'issue resolved');
                        break;
                    case 'updated':
                        this.karma.add(data.user.emailAddress, config.karma.points.issue_update, 'issue updated');
                        break;
                    default:
                        // no points for other actions
                        break;
                }
            }

            res.send('success');
        });
    }

    /**
     * Start the server and listen on the webhook endpoints
     */
    listen() {

        // fire up the server
        this.app.listen(config.server.port);
    }
}
