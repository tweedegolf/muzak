var querystring = require('querystring');
var request = require('request');

var url = 'http://localhost:8080/hooks/commit';

var github_commit = {
    "after":"1481a2de7b2a7d02428ad93446ab166be7793fbb",
    "before":"17c497ccc7cca9c2f735aa07e9e3813060ce9a6a",
    "commits":[
       {
          "author":{
             "email":"lolwut@noway.biz",
             "name":"Garen Torikian",
             "username":"octokitty"
          },
          "message":"Test"
       },
       {
          "author":{
             "email":"lolwut@noway.biz",
             "name":"Garen Torikian",
             "username":"octokitty"
          },
          "message":"This is me testing the client"
       }
    ],
    "pusher":{
       "email":"lolwut@noway.biz",
       "name":"Garen Torikian"
    },
    "repository":{
       "name":"testing",
       "owner":{
          "email":"lolwut@noway.biz",
          "name":"octokitty"
       },
       "url":"https://github.com/octokitty/testing",
    }
};

console.log('Testing github hook:', url);

var payload = JSON.stringify(github_commit);

request.post({url: url, form: {payload: payload}}, function(err, res, body) {
    console.log('Received:', body);
});
