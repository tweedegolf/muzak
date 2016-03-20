var dazeus = require('dazeus');
var options = dazeus.optionsFromArgv(argv);

var client = dazeus.connect(options, function () {
    client.on('PRIVMSG', function (network, user, channel, message) {
        client.message(network, channel, message);
    });
});
