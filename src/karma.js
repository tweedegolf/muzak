// vi:expandtab sw=4 ts=4

import storage from 'node-persist';
import _ from 'lodash';
import moment from 'moment';
import AsciiTable from 'ascii-table';

const STORAGE_KEY = 'muzak-karma';
const DECAY_FACTOR = 0.0002;

storage.initSync();

export default class Karma {

    constructor(ircmpd) {
        this.ircmpd = ircmpd;
        this.score = storage.getItem(STORAGE_KEY) || {};

        ircmpd.on('add-karma', (command, [email, points]) => {
            return new Promise((resolve) => {
                this.add(email, points, 'manual added via irc');
                resolve();
            });
        });

        ircmpd.on('karma-table', (command, [email, points]) => {
            return new Promise((resolve) => {
                var table = new AsciiTable();
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
    }

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

        storage.setItem(STORAGE_KEY, this.score);

        this.ircmpd.message(['KARMA_UPDATE:', email, comment, points].join(' '));
    }

    delete_old() {
        var start_of_day = moment().startOf('day').format('X');

        _.forEach(this.score, function (events, email) {
            this.score[email] = _.filter(events, function (event) {
                return event.time > start_of_day;
            })
        });
    }

    get_karma(events) {
        var time = moment().format('X');
        var score = 0;

        _.forEach(events, function (event) {
            score += event.points - DECAY_FACTOR * (time - event.time);
        });

        return score;
    }

    // build a sorted array of [email, score] elements
    get_table() {
        var list = _.sortBy(_.map(this.score, (events, email) => {
            return [this.get_karma(events), email];
        }), (elem) => {
            return -elem[0];
        });

        return list;
    }

    pop() {
        var table = this.get_table();

        // the first row contains an array [email, score]
        return table[0][1];
    }
}
