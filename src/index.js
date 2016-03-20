// vi:expandtab sw=4 ts=4
import * as dazeus_util from "dazeus-util";
import server from './hook_server';
import IRCMPD from "./ircmpd"
import Karma from './karma';

let argv = IRCMPD.yargs().argv;
IRCMPD.help(argv);

var dazeus_options = dazeus_util.optionsFromArgv(argv);
var mpd_options = mpdOptionsFromArgv(argv);

var ircmpd = new IRCMPD(dazeus_options, mpd_options);
var karma = new Karma(ircmpd);

server.karma = karma;
server.listen(8080);

function mpdOptionsFromArgv (argv) {
    var options = {};
    options.port = argv.mpdport;
    options.host = argv.mpd;
    if (typeof argv.pluginhost === 'string') {
        options.pluginhost = argv.pluginhost;
    }
    if (typeof argv.network == 'string') {
        options.network = argv.network;
    }
    options.channel = argv.channel;
    return options;
}
