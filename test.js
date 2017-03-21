/*global __dirname, catch, process, console, */

(function() {
  'use strict';

  var q = require('q');
  var request = require('request');
  var rp = require('request-promise');
  var fs = require('fs');
  var easyimg = require('easyimage');
  var schedule = require('node-schedule');

  // Setup
  var uploadPhoto = function(subRedditObj) {
    if (!subRedditObj.password) {
      console.log('Password not set! Exiting...');
      return false;
    }

    var createDirsIfNotExist = function() {
      var dirs = ['./images', './cookies', './already_used'];
      dirs.forEach(function(dir) {
        if (!fs.existsSync(dir)) {
          fs.mkdirSync(dir);
        }
      });
    };

    createDirsIfNotExist();

    // Download/Instagram Functions
    var Client = require('instagram-private-api').V1;
    var storage = new Client.CookieFileStorage(__dirname + '/cookies/' + subRedditObj.user + '.json');
    var device = new Client.Device(subRedditObj.user);

    var onError = function(error, deferred) {
      console.log('Error for: ' + subRedditObj.subReddit);
      if (error) {
        console.log(error);
      }
      if (deferred) {
        deferred.reject(error);
      }
    };

    var downloadImage = function(uri, fileName, callback) {
      request.head(uri, function(err, res, body) {
        request(uri).pipe(fs.createWriteStream(fileName)).on('close', function() {
          console.log('Photo downloaded: ' + fileName);
          callback();
        });
      });
    };

    var checkUsedLinks = function(subReddit, url) {
      var deferred1 = q.defer();
      var deferred2 = q.defer();

      var fileName = './already_used/' + subReddit + '.json';
      if (!fs.existsSync(fileName)) {
        fs.writeFile(fileName, JSON.stringify({
          urls: []
        }), 'utf8', function() {
          deferred1.resolve();
        });
      } else {
        deferred1.resolve();
      }

      deferred1.promise.then(function() {
        var obj = JSON.parse(fs.readFileSync(fileName, 'utf8'));
        if (obj.urls.indexOf(url) > -1) {
          deferred2.reject();
        } else {
          obj.urls.push(url);
          fs.writeFile(fileName, JSON.stringify(obj), 'utf8', function() {
            deferred2.resolve();
          });
        }
      });

      return deferred2.promise;
    };

    var getTodaysPicture = function(subReddit, skip, timeframe) {
      timeframe = timeframe || 'all';
      skip = skip || 0;
      var deferred = q.defer();
      var imageUrl;
      var fileName;
      var posts;
      var postToUse;
      rp('https://www.reddit.com/r/' + subReddit + '/top.json?sort=top&limit=100&t=' + timeframe).then(function(data) {
        posts = JSON.parse(data).data.children;
        posts.forEach(function(post, index) {
          if (index >= skip && !postToUse && post.data.preview && post.data.preview.images && post.data.preview.images[0] && (post.data.preview.images[0].source.url.indexOf('.jpg') > -1 || post.data.preview.images[0].source.url.indexOf('.jpeg') > -1)) {
            postToUse = post;
          }
        });
        if (postToUse) {
          imageUrl = postToUse.data.preview.images[0].source.url;
          fileName = './images/' + subReddit + '.jpg';
          console.log('Top photo found: ' + imageUrl);
          checkUsedLinks(subReddit, imageUrl).then(function() {
            downloadImage(imageUrl, fileName, function() {
              deferred.resolve({
                fileName: fileName,
                imageUrl: imageUrl
              });
            });
          })['catch'](function() {
            // onError("Link already used: " + imageUrl, deferred);
            skip += 1;
            getTodaysPicture(subReddit, skip, timeframe).then(function(obj) {
              deferred.resolve(obj);
            }).fail(function(error) {
              onError(error, deferred);
            });
          });
        } else {
          // onError("No jpg found for subreddit: " + subReddit, deferred);
          getTodaysPicture(subReddit, skip, timeframe).then(function(obj) {
            deferred.resolve(obj);
          }).fail(function(error) {
            onError(error, deferred);
          });
        }
      })['catch'](function(error) {
        onError(error, deferred);
      });
      return deferred.promise;
    };

    var cropPicture = function(fileName) {
      var deferred = q.defer();
      easyimg.info(fileName).then(function(image) {
        var size;
        if (image.height > image.width) {
          size = image.width;
        } else {
          size = image.height;
        }
        if (size > 1080) {
          size = 1080;
        }
        easyimg.crop({
          src: fileName,
          dst: fileName,
          cropwidth: size,
          cropheight: size,
        }).then(
          function(image) {
            console.log('Resized and cropped [' + fileName + ']: ' + image.width + ' x ' + image.height);
            deferred.resolve();
          },
          function(error) {
            onError(error, deferred);
          }
        );
      })['catch'](function(error) {
        onError(error, deferred);
      });
      return deferred.promise;
    };

    var postPicture = function(path, description) {
      var deferred = q.defer();
      Client.Session.create(device, storage, subRedditObj.user, subRedditObj.password).then(function(session) {
        session.getAccount().then(function(account) {
          // console.log(account.params);
          Client.Upload.photo(session, path).then(function(upload) {
            console.log('Photo and description upload successful with id: ' + upload.params.uploadId);
            return Client.Media.configurePhoto(session, upload.params.uploadId, description);
          }).then(function(medium) {
            // console.log(medium.params);
            deferred.resolve();
          })['catch'](function(error) {
            onError(error, deferred);
          });
        })['catch'](function(error) {
          onError(error, deferred);
        });
      })['catch'](function(error) {
        onError(error, deferred);
      });
      return q.promise;
    };

    var buildDescription = function(url) {
      return '#' + subRedditObj.hashtags.join(' #');
    };

    getTodaysPicture(subRedditObj.subReddit).done(function(data) {
      cropPicture(data.fileName).then(function() {
        postPicture(data.fileName, buildDescription(data.imageUrl));
      })['catch'](function(error) {
        onError(error, deferred);
      });
    });
  };

  // Execution
  var subRedditObjs = [{
    subReddit: 'EarthPorn',
    user: 'ourmostwonderfulworld',
    password: process.env.autoinsta,
    hashtags: ["earth", "visualsoflife", "beautiful", "lifeofadventure", "live", "letsgosomewhere", "instagood", "wonderful_places", "natgeo", "roamtheplanet", "exploring", "keepitwild", "wildlifeplanet", "exploremore", "bestvacations", "beautifuldestinations", "ourplanetdaily", "travelstoke", "lonelyplanet", "earthofficial", "earthpix", "beautifulplaces", "earthfocus", "awesomeearth", "nature", "nakedplanet", "forest"]
  }, {
    subReddit: 'barely_sfw',
    user: 'hotbabeserrywhere',
    password: process.env.autoinsta,
    hashtags: ["hot", "sexy", "ass", "boobs", "tits", "nude", "naked", "babes", "babrahamlincoln", "boobies", "naked", "nude", "sex", "pretty", "cute", "women", "woman", "girl", "hottie", "hotbabes", "sexyass", "bigtits", "bigboobs", "perfectass", "perfectboobs", "hotass", "hotbody"]
  }, {
    subReddit: 'CityPorn',
    user: 'magnificentmetropolis',
    password: process.env.autoinsta,
    hashtags: ["city", "visualsoflife", "beautiful", "lifeofadventure", "live", "letsgosomewhere", "instagood", "wonderful_places", "skyline", "roamtheplanet", "exploring", "keepitwild", "wildlifeplanet", "exploremore", "bestvacations", "beautifuldestinations", "ourplanetdaily", "travelstoke", "lonelyplanet", "cityofficial", "citypix", "beautifulcities", "cityfocus", "awesomecity", "metropolis"]
  }];

  var jobToSchedule = function() {
    subRedditObjs.forEach(function(subRedditObj) {
      uploadPhoto(subRedditObj);

      //TODO: follow people who follow/post with tags

      //TODO: comment on people's posts from tags

      //TODO: implement scheduling or run on cron

      //TODO: logging to files/notifications of errors

      //TODO: MAYBE: some dope way of getting hashtags based on the image?
    });
  };

  var job1 = schedule.scheduleJob('0 16 * * *', function() {
    jobToSchedule();
  });
  var job2 = schedule.scheduleJob('0 22 * * *', function() {
    jobToSchedule();
  });

  jobToSchedule();

}());
