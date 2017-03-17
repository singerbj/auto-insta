/*global __dirname, catch, process, console, */

(function () {
    'use strict';

    var q = require('q');
    var request = require('request');
    var rp = require('request-promise');
    var fs = require('fs');

    // Setup
    var user = 'bentesterman';
    var password = process.env.autoinsta;
    var hashtags = ["earth", "visualsoflife", "beautiful", "lifeofadventure", "live", "letsgosomewhere", "instagood", "wonderful_places", "natgeo", "roamtheplanet", "exploring", "keepitwild", "wildlifeplanet", "exploremore", "bestvacations", "beautifuldestinations", "ourplanetdaily", "travelstoke", "lonelyplanet", "earthofficial", "earthpix", "beautifulplaces", "earthfocus", "awesomeearth", "nature", "nakedplanet", "forest"];

    if (!password) {
        console.log('Password not set! Exiting...');
        process.exit(1);
    }

    var createDirsIfNotExist = function () {
        var dirs = ['./images', './cookies'];
        dirs.forEach(function (dir) {
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir);
            }
        });
    };

    createDirsIfNotExist();

    // Download/Instagram Functions
    var Client = require('instagram-private-api').V1;
    var storage = new Client.CookieFileStorage(__dirname + '/cookies/' + user + '.json');
    var device = new Client.Device(user);

    var onError = function (error, deferred) {
        console.error(error);
        deferred.reject(error);
    };

    var downloadImage = function (uri, fileName, callback) {
        request.head(uri, function (err, res, body) {
            request(uri).pipe(fs.createWriteStream(fileName)).on('close', function () {
                console.log('Photo downloaded: ' + fileName);
                callback();
            });
        });
    };

    var getTodaysPicture = function (subReddit) {
        var deferred = q.defer();
        var url;
        var fileName;
        rp('https://www.reddit.com/r/' + subReddit + '/top.json?sort=top&t=day&limit=1').then(function (data) {
            url = JSON.parse(data).data.children[0].data.url;
            fileName = './images/' + subReddit + '.jpg';
            console.log('Top photo found: ' + url);
            //TODO: check if link already used
            downloadImage(url, fileName, function () {
                deferred.resolve({
                    fileName: fileName,
                    url: url
                });
            });
        })['catch'](function (error) {
            onError(error, deferred);
        });
        return deferred.promise;
    };

    var postPicture = function (path, description) {
        var deferred = q.defer();
        Client.Session.create(device, storage, user, password).then(function (session) {
            session.getAccount().then(function (account) {
                // console.log(account.params);
                Client.Upload.photo(session, path).then(function (upload) {
                    console.log('Photo and description upload successful with id: ' + upload.params.uploadId);
                    return Client.Media.configurePhoto(session, upload.params.uploadId, description);
                }).then(function (medium) {
                    // console.log(medium.params);
                    deferred.resolve();
                })['catch'](function (error) {
                    onError(error, deferred);
                });
            })['catch'](function (error) {
                onError(error, deferred);
            });
        })['catch'](function (error) {
            onError(error, deferred);
        });
        return q.promise;
    };

    var buildDescription = function (url) {
        return '#' + hashtags.join(' #') + '\n\nsrc = ' + url;
    };

    // Execution
    getTodaysPicture('EarthPorn').done(function (data) {
        postPicture(data.fileName, buildDescription(data.url));
    });

    //TODO: follow people who follow/post with tags

    //TODO: comment on people's posts from tags

    //TODO: implement scheduling or run on cron

    //TODO: logging to files/notifications of errors

}());
