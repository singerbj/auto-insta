/*global __dirname, catch, process, console, */

(function () {
    'use strict';

    var q = require('q');
    var request = require('request');
    var rp = require('request-promise');
    var fs = require('fs');

    // Setup
    var runTask = function (taskData) {
        if (!taskData.password) {
            console.log('Password not set! Exiting...');
            return false;
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
        var storage = new Client.CookieFileStorage(__dirname + '/cookies/' + taskData.user + '.json');
        var device = new Client.Device(taskData.user);

        var onError = function (error, deferred) {
            console.log('Error for: ' + taskData.subReddit);
            if (error) {
                console.log(error);
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
            var imageUrl;
            var fileName;
            var posts;
            var postToUse;
            rp('https://www.reddit.com/r/' + subReddit + '/top.json?sort=top&t=day').then(function (data) {
                posts = JSON.parse(data).data.children;
                posts.forEach(function (post) {
                    if (!postToUse && (post.data.preview.images[0].source.url.indexOf('.jpg') > -1 || post.data.preview.images[0].source.url.indexOf('.jpeg') > -1)) {
                        postToUse = post;
                    }
                });
                if (postToUse) {
                    imageUrl = postToUse.data.preview.images[0].source.url;
                    fileName = './images/' + subReddit + '.jpg';
                    console.log('Top photo found: ' + imageUrl);
                    checkUsedLinks(subReddit, imageUrl).then(function () {
                        downloadImage(imageUrl, fileName, function () {
                            deferred.resolve({
                                fileName: fileName,
                                imageUrl: imageUrl
                            });
                        });
                    })['catch'](function () {
                        onError("Link already used: " + imageUrl, deferred);
                    });
                } else {
                    onError("No jpg found for subreddit: " + subReddit, deferred);
                }
            })['catch'](function (error) {
                onError(error, deferred);
            });
            return deferred.promise;
        };

        var postPicture = function (path, description) {
            var deferred = q.defer();
            Client.Session.create(device, storage, taskData.user, taskData.password).then(function (session) {
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
            return '#' + taskData.hashtags.join(' #') + '\n\nsrc = ' + url;
        };

        getTodaysPicture(taskData.subReddit).done(function (data) {
            postPicture(data.fileName, buildDescription(data.imageUrl));
        });

        //TODO: follow people who follow/post with tags

        //TODO: comment on people's posts from tags

        //TODO: implement scheduling or run on cron

        //TODO: logging to files/notifications of errors
    };

    // Execution
    var tasks = [{
        subReddit: 'EarthPorn',
        user: 'bentesterman',
        password: process.env.autoinsta,
        hashtags: ["earth", "visualsoflife", "beautiful", "lifeofadventure", "live", "letsgosomewhere", "instagood", "wonderful_places", "natgeo", "roamtheplanet", "exploring", "keepitwild", "wildlifeplanet", "exploremore", "bestvacations", "beautifuldestinations", "ourplanetdaily", "travelstoke", "lonelyplanet", "earthofficial", "earthpix", "beautifulplaces", "earthfocus", "awesomeearth", "nature", "nakedplanet", "forest"]
    }, {
        subReddit: 'nature',
        user: 'bentesterman',
        password: process.env.autoinsta,
        hashtags: ["earth", "visualsoflife", "beautiful", "lifeofadventure", "live", "letsgosomewhere", "instagood", "wonderful_places", "natgeo", "roamtheplanet", "exploring", "keepitwild", "wildlifeplanet", "exploremore", "bestvacations", "beautifuldestinations", "ourplanetdaily", "travelstoke", "lonelyplanet", "earthofficial", "earthpix", "beautifulplaces", "earthfocus", "awesomeearth", "nature", "nakedplanet", "forest"]
    }, {
        subReddit: 'travel',
        user: 'bentesterman',
        password: process.env.autoinsta,
        hashtags: ["earth", "visualsoflife", "beautiful", "lifeofadventure", "live", "letsgosomewhere", "instagood", "wonderful_places", "natgeo", "roamtheplanet", "exploring", "keepitwild", "wildlifeplanet", "exploremore", "bestvacations", "beautifuldestinations", "ourplanetdaily", "travelstoke", "lonelyplanet", "earthofficial", "earthpix", "beautifulplaces", "earthfocus", "awesomeearth", "nature", "nakedplanet", "forest"]
    }];

    tasks.forEach(function (task) {
        runTask(task);
    });

}());
