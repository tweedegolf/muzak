var dazeus = require('dazeus');
var server = require('./src/hook_server');

// lets parse command line args
var argv = dazeus.optimist().argv;
dazeus.help(argv);
var options = dazeus.optionsFromArgv(argv);

var client = dazeus.connect(options, function () {
    client.on('PRIVMSG', function (network, user, channel, message) {
        client.message(network, channel, message);
    });
});

server.listen(8080);
