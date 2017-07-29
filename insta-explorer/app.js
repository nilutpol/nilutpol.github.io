// Web Server
var express = require("express");
var app = express();

var Promise = require('bluebird');

/* serves main page */
app.get("/", function (req, res) {
    res.sendFile(__dirname + '/index.html')
});

app.post("/get_users", function (req, res) {
    get_users(req.query.username, res);
});

app.post("/get_followers", function (req, res) {
    get_followers(req.query.accountId, req.query.username, req.query.cursor, res);
});

app.post("/get_user_media", function (req, res) {
    get_user_media(req.query.accountId, req.query.username, req.query.cursor, res);
});

/* serves all the static files */
app.get(/^(.+)$/, function (req, res) {
    //     console.log('static file request : ' + req.params);
    res.sendFile(__dirname + req.params[0]);
});

var port = 8080;
app.listen(port, function () {
    console.log("Listening on " + port);
});

// Instagram API
var should = require('should');
var Client = require('./libs/insta-lib/client/v1');
var path = require('path');
var _ = require('underscore');
var fs = require('fs');
var rp = require("request-promise");
var dir = './cookies';
var session;
var credentails; // [username, password, proxy]

// For self-signed certificates
process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";


console.log("Contacting Instagram...");
var device = new Client.Device('nilutpol');
var storage = new Client.CookieFileStorage(__dirname + '/cookies/' + 'nilutpol.json');
var promise = Client.Session.create(device, storage, 'nilutpol', 'instagram@2014', null);

function get_users(username, res) {
    promise.then(function (session) {
            console.log("Searching instagram user: " + username);
            return [session, Client.Account.search(session, username)]
        }, function (reason) {
            console.log(reason.message);
            return [session, null];
        })
        .spread(function (session, results) {
            var converted_result = _.map(results, function (account) {
                return {
                    fullName: account.params.fullName,
                    picture: account.params.picture,
                    id: account.params.id,
                    username: account.params.username
                };
            });
            res.send(JSON.stringify(converted_result));
        });
};

function get_followers(accountId, username, cursor, res) {
    promise.then(function (session) {
        console.log("Getting followers of : " + username);
        var feed = new Client.Feed.AccountFollowers(session, accountId);

        if (cursor != null) {
            feed.setCursor(cursor);
        }

        feed.get().then(function (results) {
            var root={};
            var converted_result = _.map(results, function (account) {
                var obj = {};
                obj.fullName    = account.params.fullName;
                obj.picture     = account.params.picture;
                obj.username    = account.params.username

                return obj;
            });

            root.cursor = feed.cursor;
            root.accountId = accountId;
            root.username = username;
            root.isMoreAvailable = feed.isMoreAvailable();
            root.data = converted_result;
            res.send(JSON.stringify(root));
        });
    });
};

function get_user_media(accountId, username, cursor, res) {
    promise.then(function (session) {
        console.log("Getting instagram user media: " + username);
        var feed = new Client.Feed.UserMedia(session, accountId);

        if (cursor != null) {
            feed.setCursor(cursor);
        }

        feed.get().then(function (results) {
            var root={};
            var converted_result = _.map(results, function (account) {
                var obj = {};
                obj.caption=account.params.caption;
                obj.likeCount=account.params.likeCount;

                if(account.params.images != undefined && account.params.images.length > 1)
                {
                    obj.images = account.params.images;
                }
                return obj;
            });

            root.cursor = feed.cursor;
            root.accountId = accountId;
            root.username = username;
            root.isMoreAvailable = feed.isMoreAvailable();
            root.data = converted_result;
            res.send(JSON.stringify(root));
        });
    });
};
