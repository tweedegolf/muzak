// vi:expandtab sw=4 ts=4

import storage from 'node-persist';
import _ from 'lodash';
import moment from 'moment';
import AsciiTable from 'ascii-table';
import config from '../config';
import {sprintf} from 'sprintf';

storage.initSync();

/**
 * The karma class contains and persistently stores the karma for each user
 */
export default class Karma {

    /**
     * Karma constructor
     * @param ircmpd
     */
    constructor(ircmpd) {
        this.ircmpd = ircmpd;
        this.score = storage.getItem(config.karma.storage_key) || {};

        // remove old events (since the start of the day)
        this.delete_old();
    }

    /**
     * Respond to irc karma queries
     */
    listen() {

        this.ircmpd.on('add-karma', (command, [email, points]) => {
            return new Promise((resolve) => {
                this.add(email, parseInt(points, 10), 'manual added via irc');

                resolve();
            });
        });

        this.ircmpd.on('karma-table', () => {
            return new Promise((resolve) => {
                var table = new AsciiTable();
                table.setHeading('e-mail', 'karma');

                _.forEach(this.get_table(), ([score, email]) => {
                    table.addRow(email, AsciiTable.align(
                        AsciiTable.RIGHT,
                        score.toFixed(4).toString(),
                        10
                    ));
                });

                resolve(table.toString());
            });
        });

        this.ircmpd.on('karma-factors', () => {
            return new Promise((resolve) => {
                var table = new AsciiTable();
                table.setHeading('e-mail', 'factor');

                _.forEach(this.get_factors(), (factor, email) => {
                    table.addRow(email, AsciiTable.align(
                        AsciiTable.RIGHT,
                        factor.toFixed(4).toString(),
                        10
                    ));
                });

                resolve(table.toString());
            });
        });
    }

    /**
     * Add or remove karma points for a user identified by an email address
     * Takes an optional comment
     *
     * @param email
     * @param points
     * @param comment
     */
    add(email, points, comment) {
        var time = moment().format('X');

        if (!this.score[email]) {
            this.score[email] = [];
        }

        this.score[email].push({
            points,
            time,
            comment
        });

        storage.setItem(config.karma.storage_key, this.score);

        this.ircmpd.message(sprintf(
            'KARMA: %s received %d points "%s", current karma: %.4f',
            email,
            points,
            comment,
            this.get_karma(this.score[email])
        ));
    }

    /**
     * Remove all karma events since the last midnight
     */
    delete_old() {
        var start_of_day = moment().startOf('day').format('X');

        _.forEach(this.score, (events, email) => {
            this.score[email] = _.filter(events, (event) => {
                return event.time > start_of_day;
            })
        });
    }

    /**
     * Calculate the karma value for a set of events
     *
     * @param events
     * @returns {number}
     */
    get_karma(events) {
        var time = moment().format('X');
        var score = 0;

        _.forEach(events, function (event) {
            score += event.points * Math.min(1, 1 / Math.sqrt((time - event.time) / 100));
        });

        return score;
    }

    /**
     * build a sorted array of [email, score] elements
     *
     * @returns {Array}
     */
    get_table() {
        return _.sortBy(_.map(this.score, (events, email) => {
            return [this.get_karma(events), email];
        }), (elem) => {
            return -elem[0];
        });
    }

    /**
     * Retrieve the karma factors of all users
     *
     * @returns {{}}
     */
    get_factors() {
        var table = this.get_table();
        var factors = {};

        // retrieve the max karma
        var score_sum = _.sumBy(table, ([score, email]) => {
            factors[email] = 0;
            return score;
        });

        if (score_sum === 0) {
            return factors;
        }

        _.forEach(table, function ([score, email]) {
            factors[email] = score / score_sum;
        });

        return factors;
    }
}
