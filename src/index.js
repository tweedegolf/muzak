// vi:expandtab sw=4 ts=4
import * as dazeus from "dazeus";
import * as dazeus_util from "dazeus-util";
import server from './hook_server';
import IRCMPD from "./ircmpd"

let argv = IRCMPD.yargs().argv;
IRCMPD.help(argv);

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
        else if(subcommand === "search"){
            msg = ircmpd.search(args.slice(1));
        }
        else if(subcommand === "lastsearch"){
            msg = ircmpd.last_search();
        }
        else if(subcommand === "list"){
            msg = ircmpd.list();
        }
        else if(subcommand === "playing" || subcommand === "currentplaying" || subcommand === "np") {
            msg = ircmpd.currentplaying();
        }
        else {
            msg = new Promise((resolve) => {
                resolve("Unknown command: " + subcommand);
            });
        }

        msg.then((msg) => {
            var host = "";
            if(typeof argv.pluginhost === 'string') {
                host = "[" + argv.pluginhost + "] ";
            }
            dazeus_client.message(network, channel, host + msg);
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
