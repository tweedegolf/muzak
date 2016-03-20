import * as dazeus from "dazeus";
import * as dazeus_util from "dazeus-util";
import server from './hook_server';

let argv = dazeus_util.yargs().argv;
dazeus_util.help(argv);
var options = dazeus_util.optionsFromArgv(argv);

let client = dazeus.connect(options, () => {
    client.on('PRIVMSG', (network, user, channel, message) => {
        client.message(network, channel, message);
    });
});

server.listen(8080);
