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
        var dirs = ['./images', './cookies', './already_used'];
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
        if (error) {
            console.error(error);
        }
        if (deferred) {
            deferred.reject(error);
        }
    };

    var downloadImage = function (uri, fileName, callback) {
        request.head(uri, function (err, res, body) {
            request(uri).pipe(fs.createWriteStream(fileName)).on('close', function () {
                console.log('Photo downloaded: ' + fileName);
                callback();
            });
        });
    };

    var checkUsedLinks = function (subReddit, url) {
        var deferred1 = q.defer();
        var deferred2 = q.defer();

        var fileName = './already_used/' + subReddit + '.json';
        if (!fs.existsSync(fileName)) {
            fs.writeFile(fileName, JSON.stringify({
                urls: []
            }), 'utf8', function () {
                deferred1.resolve();
            });
        } else {
            deferred1.resolve();
        }

        deferred1.promise.then(function () {
            var obj = JSON.parse(fs.readFileSync(fileName, 'utf8'));
            if (obj.urls.indexOf(url) > -1) {
                deferred2.reject();
            } else {
                obj.urls.push(url);
                fs.writeFile(fileName, JSON.stringify(obj), 'utf8', function () {
                    deferred2.resolve();
                });
            }
        });

        return deferred2.promise;
    };

    var getTodaysPicture = function (subReddit) {
        var deferred = q.defer();
        var url;
        var fileName;
        rp('https://www.reddit.com/r/' + subReddit + '/top.json?sort=top&t=day&limit=1').then(function (data) {
            url = JSON.parse(data).data.children[0].data.url;
            fileName = './images/' + subReddit + '.jpg';
            console.log('Top photo found: ' + url);
            checkUsedLinks(subReddit, url).then(function () {
                downloadImage(url, fileName, function () {
                    deferred.resolve({
                        fileName: fileName,
                        url: url
                    });
                });
            })['catch'](function () {
                onError("Link already used: " + url, deferred);
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
