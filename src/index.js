// vi:expandtab sw=4 ts=4
import * as dazeus from "dazeus";
import * as dazeus_util from "dazeus-util";
import server from './hook_server';
import IRCMPD from "./ircmpd"

let argv = dazeus_util.yargs().argv;
dazeus_util.help(argv);

var custom_options = customOptionsFromArgv(argv);
var mpd_options = mpdOptionsFromArgv(argv);
var ircmpd = new IRCMPD(mpd_options);

var dazeus_options = dazeus_util.optionsFromArgv(argv);
let dazeus_client = dazeus.connect(dazeus_options, () => {
    dazeus_client.onCommand("mpd", function (network, user, channel, command, line, ... args) {
        var msg = "";
        var subcommand = args[0];
        if(subcommand === "queue"){
            var ssubcommand = args[1];
            if(ssubcommand === "clear"){
                msg = ircmpd.queue_clear();
            } else {
                msg = ircmpd.queue(args.slice(1));
            }
        }
        if(subcommand === "search"){
            msg = ircmpd.search(args.slice(1));
        }
        if(subcommand === "lastsearch"){
            msg = ircmpd.last_search();
        }
        if(subcommand === "list"){
            msg = ircmpd.list();
        }
        if(subcommand === "playing" || subcommand === "currentplaying" || subcommand === "np") {
            msg = ircmpd.currentplaying();
        }

        msg.then((msg) => {
            dazeus_client.message(network, channel, "<" + custom_options.pluginhost + ">: " + msg);
        }, console.error );
    });
});

server.listen(8080);

function mpdOptionsFromArgv (argv) {
    var options = {};
    if (typeof argv.mpdport === 'number') {
        options.port = argv.mpdport;
    } else {
        options.port = 6600;
    }
    if (typeof argv.mpd === 'string') {
        options.host = argv.mpd;
    } else {
        options.host = "127.0.0.1";
    }
    return options;
}

function customOptionsFromArgv (argv) {
    var options = {};
    if(typeof argv.pluginhost === 'string') {
        options.pluginhost = argv.pluginhost;
    } else {
        options.pluginhost = "<loser>";
    }
    return options;
}
