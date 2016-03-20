// vi:expandtab sw=4 ts=4

import storage from 'node-persist';
import _ from 'lodash';
import moment from 'moment';

const STORAGE_KEY = 'muzak-karma';
const DECAY_FACTOR = 0.0002;

storage.initSync();

class Karma {

    constructor() {
        this.score = storage.getItem(STORAGE_KEY) || {};
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

        console.log(this.get_table());
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
            score += event.score * DECAY_FACTOR * (time - event.time);
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

export default new Karma();
