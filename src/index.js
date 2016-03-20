import * as dazeus from "dazeus";
import * as dazeus_util from "dazeus-util";
import server from './hook_server';
import IRCMPD from "./ircmpd"

let argv = dazeus_util.yargs().argv;
dazeus_util.help(argv);
var options = dazeus_util.optionsFromArgv(argv);

var ircmpd = new IRCMPD();

let client = dazeus.connect(options, () => {
	client.onCommand("mpd", function (network, user, channel, command, line, ... args) {
		console.log(command);
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
		if(subcommand === "list"){
			msg = ircmpd.list();
		}

		client.message(network, channel, msg);
	});
});

server.listen(8080);
