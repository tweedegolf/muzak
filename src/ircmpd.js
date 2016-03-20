// vi:expandtab sw=4 ts=4

import * as dazeus from "dazeus";
import * as dazeus_util from "dazeus-util";
import * as mpd from "mpd";

export default class IRCMPD {
    constructor(dazeus_options, mpd_options){
        this.search_results_ = [];
        this.mpdc = mpd.connect(mpd_options);
        this.pluginhost = mpd_options.pluginhost;
        var that = this;
        this.mpdc.on('ready', function() {
            // update configuration
            that.mpdc.sendCommand("consume 1", function(err, msg) {
                if (err) throw err;
            });
          console.log("ready");
        });
        this.mpdc.on('system', function(name) {
          console.log("update", name);
        });
        this.mpdc.on('system-player', function() {
          that.mpdc.sendCommand(mpd.cmd("status", []), function(err, msg) {
            if (err) throw err;
            console.log(msg);
          });
        });

        this.subcommand_handlers = {}
        this.dazeus = dazeus.connect(dazeus_options, () => {
            this.dazeus.onCommand("mpd", function (network, user, channel, command, line, ... args) {
                var subcommand = args[0];
                that._on_irc_command(network, user, channel, subcommand, args.slice(1));
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

    /* register an }mpd subcommand handler, it should return a promise that would return
     * a message to go on IRC. example:
     * > on('foo', () => {
     * >   return new Promise((resolve) => { resolve("Hello world"); });
     * > });
     * now, "}mpd foo" would return "Hello world" on IRC
     */
    on(subcommand, callback) {
        this.subcommand_handlers[subcommand] = callback;
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

    _on_irc_command(network, user, channel, subcommand, args) {
        var msg;
        if(subcommand === "queue"){
            var ssubcommand = args[0];
            if(ssubcommand === "clear"){
                msg = this.queue_clear();
            } else {
                msg = this.queue(args);
            }
        }
        else if(subcommand === "search"){
            msg = this.search(args);
        }
        else if(subcommand === "lastsearch"){
            msg = this.last_search();
        }
        else if(subcommand === "list"){
            msg = this.list();
        }
        else if(subcommand === "playing" || subcommand === "currentplaying" || subcommand === "np") {
            msg = this.currentplaying();
        } else {
            var handler = this.subcommand_handlers[subcommand];
            if(handler) {
                msg = handler(command, args);
            } else {
                msg = new Promise((resolve) => {
                    resolve("Unknown command: " + subcommand);
                });
            }
        }

        msg.then((msg) => {
            var host = "";
            if(typeof this.pluginhost === 'string') {
                host = "[" + this.pluginhost + "] ";
            }
            var lines = msg.split("\n").filter((line) => { return line.length > 0; });
            if(lines.length > 0){
                for(var i = 0; i < lines.length; i += 1){
                    lines[i] = host + lines[i];
                }
            }
            msg = lines.join("\n");
            this.dazeus.message(network, channel, msg);
        }, console.error );
    }

    static yargs() {
        return dazeus_util.yargs()
            .string("mpd")
            .describe("mpd", "Hostname of the MPD daemon")
            .default("mpd", "127.0.0.1")
            .string("mpdport")
            .describe("mpdport", "Port of the MPD daemon")
            .default("mpdport", 6600)
            .string("pluginhost")
            .describe("pluginhost", "Something to prepend to all messages")
    }

    static help(argv) {
        dazeus_util.help(argv);
    }
};

