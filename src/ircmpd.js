// vi:expandtab sw=4 ts=4

import storage from 'node-persist';
import * as dazeus from "dazeus";
import * as dazeus_util from "dazeus-util";
import * as mpd from "mpd";
import * as _ from "lodash";

const STORAGE_KEY = 'muzak-users';

storage.initSync();

export default class IRCMPD {
    constructor(dazeus_options, mpd_options){
        this.search_results_ = [];
        this.mpdc = mpd.connect(mpd_options);
        this.pluginhost = mpd_options.pluginhost;
        this.network = mpd_options.network;
        this.channel = mpd_options.channel;
        this.users = storage.getItem(STORAGE_KEY) || [];
        this.user_score_provider = () => { return undefined; }
        /* user: { email: ["foo@bar.tld", "quux@bar.tld"], playlist: "foo", nick: "foo"} */

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
          that.status(function(status) {
              if(status.state === "stop") {
                  that._queue_next();
              }
              console.log(status);
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

    get_song(song_id){
        if(this.pretty_results_){
            var song = this.pretty_results_[song_id];
            return song;
        }
    }

    playlistadd(name, song_id){
        var song = this.get_song(song_id);
        return new Promise((resolve, reject) => {
            this._playlistadd(name, song.id).then(() => {
                resolve("Added " + this.pretty_song(song) + " to playlist " + name);
            }, reject);
        });
    }

    _playlistadd(name, song_id) {
        return new Promise((resolve, reject) => {
            if(!name){ throw "There's no playlist for you"; }
            this.mpdc.sendCommand(mpd.cmd("playlistadd", [name, song_id]), (err, msg) => {
                if (err) {
                    reject(err);
                    return;
                }
                resolve();
            });
        });
    }

    playlistinfo(name){
        return new Promise((resolve, reject) => {
            var p = this._playlistinfo(name);
            p.then((plinfo) => {
                resolve(JSON.stringify(plinfo));
            }, reject);
        });
    }

    _playlistinfo(name) {
        return new Promise((resolve, reject) => {
            this.mpdc.sendCommand(mpd.cmd("listplaylistinfo", [name]), (err, msg) => {
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
                    if(key) result[key] = value;
                });
                if(result) {
                    results.push(result);
                }
                resolve(results);
            });
        });
    }

    _play() {
        return new Promise((resolve, reject) => {
            this.mpdc.sendCommand("play", (err, msg) => {
                if (err) {
                    reject(err);
                    return;
                }
                resolve();
            });
        });
    }

    _playlistmove(name, num, pos) {
        return new Promise((resolve, reject) => {
            this.mpdc.sendCommand(mpd.cmd("playlistmove", [name, num, pos]), (err, msg) => {
                if (err) {
                    reject(err);
                    return;
                }
                resolve();
            });
        });
    }

    status(callback) {
        this.mpdc.sendCommand("status", (err, msg) => {
            if(err) throw err;
            var s = {};
            this._parse_keyvalue(msg, (key, value) => {
                s[key] = value;
            });
            callback(s);
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
                    if(key) result[key] = value;
                });
                if(result) {
                    results.push(result);
                }
                this.search_results_ = results.slice(0, 10);
                if(results.length == 0) {
                    resolve("No results for that query!");
                } else {
                    resolve(this.parse_results());
                }
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

    pretty_mpd_song(mpd_result_song){
        var e= mpd_result_song;
        return e.Artist + " - " + e.Title;
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
        var song = this.get_song(song_id);
        return new Promise((resolve, reject) => {
            this._queue(song.id).then(() => {
                resolve("Queued " + this.pretty_song(song));
            }, reject);
        });
    }

    _queue (song_id) {
        return new Promise((resolve, reject) => {
            this.mpdc.sendCommand(mpd.cmd("add", [song_id]), (err, msg) => {
                if (err) {
                    reject(err);
                    return;
                }
                resolve();
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

    simple_commands(command){
        var mapping = [
            ["next", "Next!"],
        ["play", "Playing!"],
        ["pause", "Pausing!"],
        ["stop", "Stopping!"]
            ];

        var found_command;
        mapping.forEach((stored_commands) => {
            if(stored_commands[0] === command){
                found_command = stored_commands;
                return false;
            }
        });

        return new Promise((resolve, reject) => {
            if(found_command){
                this.mpdc.sendCommand(mpd.cmd(found_command[0], []), (err, msg) => {
                    if (err) throw err;
                    resolve(found_command[1]);
                });
            } else {
                var available_commands = _.map(mapping, (e) => { return e[0]; });
                reject("Simple command " + command + " is not defined. Try any of the following: " + JSON.stringify(available_commands));
            }
        });
    }

    next(){
        simple_commands("next");
    }

    play(){
        simple_commands("play");
    }

    pause(){
        simple_commands("pause");
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

    message(str) {
        if(!this.network || !this.channel) {
            console.log("Can't send message, no --network or --channel set: " + str);
            return;
        }
        this._message(this.network, this.channel, str);
    }

    _message(network, channel, msg) {
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
        var mpd_user = this.nick_to_user(user);
        if(!mpd_user.playlist){
            mpd_user.playlist = this.nick_to_playlist(mpd_user.nick);
            this._commit_users();
            this._message(network, channel, "Created playlist for " + JSON.stringify(mpd_user));
        }

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
        }
        else if(subcommand === "playlistadd-raw"){
            msg = this.playlistadd(args[0], args[1]);
        }
        else if(subcommand === "playlistadd"){
            msg = this.playlistadd(mpd_user.playlist, args[0]);
        }
        else if(subcommand === "playlistinfo-raw"){
            msg = this.playlistinfo(args[0]);
        }
        else if(subcommand === "playlistinfo"){
            msg = this.playlistinfo(mpd_user.playlist);
        }
        else if(subcommand === "email") {
            user = this.nick_to_user(user);
            if(args[0]) {
                user.email.push(args[0]);
                msg = "Registered " + args[0] + " to you!";
                this._commit_users();
            } else {
                msg = "Your registered email addresses: " + user.email.join(", ");
            }
            msg = new Promise((resolve) => { resolve(msg); });
        }
        else if(_.indexOf(["play", "pause", "next", "stop"], subcommand) !== -1 ){
            msg = this.simple_commands(subcommand);
        } else {
            var handler = this.subcommand_handlers[subcommand];
            if(handler) {
                msg = handler(subcommand, args);
            } else {
                msg = new Promise((resolve) => {
                    resolve("Unknown command: " + subcommand);
                });
            }
        }

        if(msg) msg.then((msg) => {
            this._message(network, channel, msg);
        }, (error) => {
            this._message(network, channel, "Command failed: " + error );
        });
    }

    _queue_next() {
        // var users = this.user_score_provider();
        var users = [
            ["nick@astrant.net", 0.5],
            ["marlon@tweedegolf.com", 0.25],
            ["github@sjorsgielen.nl", 0.25],
        ];
        console.log(users);
        console.log(this.users);
        // TODO: Filter users that don't have queued songs

        // we're stopped, time to queue the next song and fire it up again
        var email;
        while(!email){
            for(var i = 0; i < users.length; i += 1){
                var dice = Math.random();
                var chance = users[i][1];
                var m = users[i][0];
                if(dice <= chance){
                    email = users[i][0];
                    console.log("Mail ", email, " won!");
                    break;
                }
            }
        }
        var user = this.email_to_user(email);
        if(!user) {
            throw "No user found for email " + email;
        }
        console.log("That's user: ", user);

        this._move_playlist_to_playing(user.playlist).then(() => {},
            (error) => {
                if(!message_sent) {
                    this.message(error);
                    message_sent = true;
                }
            });
    }

    _move_playlist_to_playing(playlist_name) {
        return new Promise((resolve, reject) => {
            var handle_error = (err) => {
                console.log(err);
                reject("Failed to retrieve playlist info for playlist " + user.playlist + ": " + err);
            };

            var promise = this._playlistinfo(playlist_name);
            promise.then((plinfo) => {
                if(plinfo.length == 0) {
                    reject("Playlist is empty");
                    return;
                }
                var next = plinfo[0];
                this._queue(next.file).then(() => {
                    resolve();
                    this._play().then(() => {
                        // move track in playlist as well
                        this._playlistmove(playlist_name, 0, plinfo.length - 1).then(() => {}, handle_error);
                    }, handle_error);
                }, handle_error);
            }, handle_error);
        });
    }

    email_to_user(email) {
        for(var i in this.users) {
            for(var j in this.users[i].email) {
                if(this.users[i].email[j] == email) {
                    return this.users[i];
                }
            }
        }
        return undefined;
    }

    nick_to_playlist(nick){
        return nick;
    }

    nick_to_user(nick) {
        for(var i in this.users) {
            if(this.users[i].nick == nick) {
                return this.users[i];
            }
        }

        var user = {
            nick: nick,
            email: [],
            playlist: this.nick_to_playlist(nick)
        };
        this.users.push(user);
        return user;
    }

    _commit_users() {
        storage.setItem(STORAGE_KEY, this.users);
    }

    set_user_score_provider(provider) {
        this.user_score_provider = provider;
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
            .string("network")
            .describe("network", "What network to send events to")
            .string("channel")
            .describe("channel", "What channel to send events to")
            .default("channel", "#muzak")
    }

    static help(argv) {
        dazeus_util.help(argv);
    }
};

