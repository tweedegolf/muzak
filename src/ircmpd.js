// vi:expandtab sw=4 ts=4

import * as mpd from "mpd";

export default class IRCMPD {
	constructor(){
		this.queue_ = [];
	}

    search (mpdc, str, callback) {
        var results = [];
        mpdc.sendCommand(mpd.cmd("search", ["any", str]), (err, msg) => {
            if (err) throw err;
            var result;
            var i = 0;
            while(i < msg.length) {
                var linepos = msg.indexOf("\n", i);
                if(linepos == -1) linepos = msg.length;
                var line = msg.substr(i, linepos - i);
                i = linepos + 1;

                if(line == '') {
                    continue;
                }
                var pos = line.indexOf(":");
                if(pos == -1) {
                    throw new Error("Misunderstood line from mpd search: " + line);
                }
                var key = line.substr(0, pos);
                var value = line.substr(pos + 2);
                if(key == "file") {
                    if(result) results.push(result);
                    result = {};
                }
                result[key] = value;
            };
            if(result) {
                results.push(result);
            }
            callback(results);
        });
    }

	queue (song_id) {
		this.queue_.push(song_id);
		return "Queued " + song_id;
	}

	queue_clear() {
		this.queue_ = [];
		return "Queue cleared";
	}

	list (){
		return "Queue: " + this.queue_.join();
	}
};

