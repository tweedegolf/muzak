import storage from 'node-persist';
import _ from 'lodash';

const STORAGE_KEY = 'muzak-karma';

storage.initSync();

class Karma {

    constructor() {
        this.score = storage.getItem(STORAGE_KEY) || {};
    }

    add(email, points) {
        if (!this.score[email]) {
            this.score[email] = 0;
        }
        this.score[email] += points;

        console.log(this.get_table());
        storage.setItem(STORAGE_KEY, this.score);
    }

    // build a sorted array of [email, score] elements
    get_table() {
        var list = _.sortBy(_.map(this.score, (score, email) => {
            return [score, email];
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
