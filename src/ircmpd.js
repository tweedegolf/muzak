// vi:expandtab sw=4 ts=4

import * as mpd from "mpd";

export default class IRCMPD {
    constructor(options){
        this.search_results_ = [];
        this.mpdc = mpd.connect(options);
        this.mpdc.on('ready', function() {
          console.log("ready");
        });
        this.mpdc.on('system', function(name) {
          console.log("update", name);
        });
        this.mpdc.on('system-player', function() {
          this.mpdc.sendCommand(mpd.cmd("status", []), function(err, msg) {
            if (err) throw err;
            console.log(msg);
          });
        });
    }

    search (str) {
        return new Promise((resolve, reject) => {
            this.mpdc.sendCommand(mpd.cmd("search", ["any", str]), (err, msg) => {
                if (err) {
                    reject(err);
                    return;
                }

                var result;
                var results = [];
                this._parse_keyvalue(msg, (key, value) => {
                    if(key == "file") {
                        if(result) results.push(result);
                        result = {};
                    }
                    result[key] = value;
                });
                if(result) {
                    results.push(result);
                }
                this.search_results_ = results.slice(0, 10);
                this.parse_results();
                resolve(this.parse_results());
            });
        });
    }

    parse_results() {
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

        var msg = "";
        this.pretty_results_ = pretty_results;
        pretty_results.forEach((e) => {
            msg += e.listed_id + ": " + this.pretty_song(e) + "\n";
        });
        return msg;
    }

    pretty_song(pretty_result_song){
        var e = pretty_result_song;
        return e.artist + " - " + e.title;
    }

    last_search(){
        return new Promise((resolve) => {
            resolve(this.parse_results());
        });
    }

    queue (song_id) {
        var song = this.pretty_results_[song_id];
        console.log(song);
        return new Promise((resolve, reject) => {
            this.mpdc.sendCommand(mpd.cmd("add", [song.id]), (err, msg) => {
                if (err) throw err;
                resolve("Queued " + this.pretty_song(song));
            });
        });
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
        return new Promise((resolve, reject) => {
            this.mpdc.sendCommand('currentsong', (err, msg) => {
                if(err) {
                    reject(err);
                    return;
                }
                var s = {};
                this._parse_keyvalue(msg, (key, value) => {
                    s[key] = value;
                });
                resolve("Now playing: " + s.Artist + " - " + s.Title);
            });
        });
    }

    _parse_keyvalue(msg, callback) {
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
                throw new Error("Incorrect line from mpd: " + line);
            }
            var key = line.substr(0, pos);
            var value = line.substr(pos + 2);
            callback(key, value);
        };
    }
};

