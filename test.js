/*global __dirname, catch*/

(function() {
  'use strict';

  var Client = require('instagram-private-api').V1;
  var storage = new Client.CookieFileStorage(__dirname + '/cookies/' + user + '.json');
  var q = require('q');
  var request = require('request');
  var rp = require('request-promise');
  var fs = require('fs');

  var user = 'bentesterman';
  var password = process.env.autoinsta;
  var device = new Client.Device(user);
  var fileName = 'image.jpg';

  var downloadImage = function(uri, filename, callback) {
    request.head(uri, function(err, res, body) {
      request(uri).pipe(fs.createWriteStream(filename)).on('close', callback);
    });
  };

  var getTodaysPicture = function() {
    var deferred = q.defer();
    rp('https://www.reddit.com/r/EarthPorn/top.json?sort=top&t=day&limit=1').then(function(data) {
      var url = JSON.parse(data).data.children[0].data.url;
      downloadImage(url, fileName, function() {
        deferred.resolve();
      });
    }).catch(function(error) {
      deferred.reject(error);
    });
    return deferred.promise;
  };

  var postPicture = function(path, description) {
    var deferred = q.defer();
    Client.Session.create(device, storage, user, password).then(function(session) {
      session.getAccount().then(function(account) {
        // console.log(account.params);
        Client.Upload.photo(session, path).then(function(upload) {
          console.log('Photo upload successful with id: ' + upload.params.uploadId);
          return Client.Media.configurePhoto(session, upload.params.uploadId, description);
        }).then(function(medium) {
          // console.log(medium.params);
          deferred.resolve();
        })['catch'](function(error) {
          deferred.reject(error);
        });
      })['catch'](function(error) {
        deferred.reject(error);
      });
    })['catch'](function(error) {
      deferred.reject(error);
    });
    return q.promise;
  };

  getTodaysPicture().done(function() {
    postPicture(fileName, '\n#earth\n#visualsoflife\n#beautiful\n#lifeofadventure\n#live\n#letsgosomewhere\n#instagood\n#wonderful_places\n#natgeo\n#roamtheplanet\n#exploring\n#keepitwild\n#wildlifeplanet\n#exploremore\n#bestvacations\n#beautifuldestinations\n#ourplanetdaily\n#travelstoke\n#lonelyplanet\n#earthofficial\n#earthpix\n#beautifulplaces\n#earthfocus\n#awesomeearth\n#nature\n#nakedplanet\n#forest');
  });

}());
