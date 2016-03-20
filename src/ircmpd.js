// vi:expandtab sw=4 ts=4

import * as mpd from "mpd";

export default class IRCMPD {
    constructor(){
        this.search_results_ = [];
    }

    search (mpdc, str) {
        return new Promise((resolve, reject) => {
            mpdc.sendCommand(mpd.cmd("search", ["any", str]), (err, msg) => {
                if (err) throw err;
                var result;
                var results = [];
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
                this.search_results_ = results.slice(1, 10);
                resolve(this.parse_results());
            });
        });
    }

    parse_results() {
        var msg = "";
        var listed_id = 0;
        var pretty_results = []
        this.search_results_.forEach((e) => {
            var pretty = {};
            pretty.id = e.file;
            pretty.listed_id = listed_id;
            listed_id = listed_id + 1;
            pretty.artist = e.Artist;
            pretty.title = e.Title;
            pretty_results.push(pretty);
        });
        this.pretty_search_results_ = pretty_results;
        this.pretty_search_results_.forEach((e) => {
            msg += e.listed_id + ": " + e.artist + " - " + e.title + "\n";
        });
        console.log(msg);
        return msg;
    }

    last_search(){
        console.log("lastseasrch");
        return JSON.stringify(this.search_results_);
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

    play(){
        return "Playing";
    }

    pause(){
        return "Pausing";
    }

    currentplaying(){
        return "Now playing Floep";
    }
};

