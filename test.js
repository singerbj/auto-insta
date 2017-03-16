/*global __dirname, catch*/

(function () {
    'use strict';

    var Client = require('instagram-private-api').V1;
    var user = 'bentesterman';
    var password = process.env.autoinsta;
    var device = new Client.Device(user);
    var storage = new Client.CookieFileStorage(__dirname + '/cookies/' + user + '.json');
    var q = require('q');
    var rp = require('request-promise');


    var postPicture = function (path, description) {
        var deferred = q.defer();
        Client.Session.create(device, storage, user, password).then(function (session) {
            session.getAccount().then(function (account) {
                // console.log(account.params);
                Client.Upload.photo(session, path).then(function (upload) {
                    // console.log(upload.params.uploadId);
                    return Client.Media.configurePhoto(session, upload.params.uploadId, description);
                }).then(function (medium) {
                    // console.log(medium.params);
                    deferred.resolve();
                })['catch'](function (error) {
                    deferred.reject(error);
                });
            })['catch'](function (error) {
                deferred.reject(error);
            });
        })['catch'](function (error) {
            deferred.reject(error);
        });
        return q.promise;
    };

    var getTodaysPicture = function () {
        var deferred = q.defer();
        rp('http://www.google.com').then(function (htmlString) {
            // Process html...
        }).catch(function (err) {
            // Crawling failed...
        });
    };

    postPicture('./image.jpg', '\n#yolo\n#swag\n#dopeness');

}());
