// vi:expandtab sw=4 ts=4
import * as dazeus from "dazeus";
import * as dazeus_util from "dazeus-util";
import server from './hook_server';
import IRCMPD from "./ircmpd"
import * as mpd from "mpd";

let argv = dazeus_util.yargs().argv;
dazeus_util.help(argv);

var ircmpd = new IRCMPD();

var mpd_options = mpdOptionsFromArgv(argv);
var mpd_client = mpd.connect(mpd_options);
mpd_client.on('ready', function() {
  console.log("ready");
});
mpd_client.on('system', function(name) {
  console.log("update", name);
});
mpd_client.on('system-player', function() {
  mpd_client.sendCommand(mpd.cmd("status", []), function(err, msg) {
    if (err) throw err;
    console.log(msg);
  });
});
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
            msg = ircmpd.search(mpd_client, args.slice(1));
        }
        if(subcommand === "lastsearch"){
            msg = ircmpd.last_search();
        }
        if(subcommand === "list"){
            msg = ircmpd.list();
        }

        msg.then((msg) => {
            dazeus_client.message(network, channel, msg);
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
