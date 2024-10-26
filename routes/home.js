var User = require('../app/models/user');
var Checkin = require('../app/models/checkin');
var ForumPost = require('../app/models/forumpost');
var PolishColors = require('../app/constants/polishColors');
var moment = require('moment-timezone');
var _ = require('lodash');

module.exports = function(app, passport) {


app.get('/', function(req, res) {
    if (req.isAuthenticated()) {
        data = {};
        data.title = 'Lacquer Tracker';
        Checkin.find({'pendingdelete':false}).select('user photo type creationdate').populate('user', 'username').exec(function(err, checkins) {
            var recentCheckins = _.filter(checkins, function(x) {
                return moment(x.creationdate).isAfter(moment().subtract(30, 'days'));
            })
            if (recentCheckins.length > 0) {
                var featuredcheckin = recentCheckins[Math.floor(Math.random() * recentCheckins.length)];
                if (featuredcheckin.type !== "video") {
                    data.featureid = featuredcheckin.id;
                    data.featureuser = featuredcheckin.user;
                    data.featurephoto = featuredcheckin.photo;
                } else {
                    data.featureid = featuredcheckin.id;
                    data.featureuser = featuredcheckin.user;
                    data.featurephoto = featuredcheckin.photo.split('.').slice(0, -1).join('.')+'thumb.jpeg';
                }
            } else {
                var featuredcheckin = checkins[Math.floor(Math.random() * checkins.length)];
                if (featuredcheckin.type !== "video") {
                    data.featureid = featuredcheckin.id;
                    data.featureuser = featuredcheckin.user;
                    data.featurephoto = featuredcheckin.photo;
                } else {
                    data.featureid = featuredcheckin.id;
                    data.featureuser = featuredcheckin.user;
                    data.featurephoto = featuredcheckin.photo.split('.').slice(0, -1).join('.')+'thumb.jpeg';
                }
            }
            User.findById(req.user.id).populate('ownedpolish', 'brand colorsname tool').populate('wantedpolish', 'brand').populate('checkins', 'creationdate').exec(function(err, user) {
                ForumPost.find({'user':req.user.id, 'forum':'intro'}).exec(function(err, intro) {
                    data.intro = intro;
                    if (moment(user.creationdate).add(7, 'days').toDate() > moment().toDate() === true) {
                        data.newuser = true;
                    } else {
                        data.newuser = false;
                    }
                    if ((user.checkins.length > 0) && (moment(user.checkins[user.checkins.length - 1].creationdate).add(1, 'month').toDate() < moment().toDate() === true)) {
                        data.checkinreminder = true;
                    } else {
                        data.checkinreminder = false;
                    }
                    var ownedpolish = [];
                    var ownedaccessories = [];
                    for (i=0; i<user.ownedpolish.length; i++) {
                        if (user.ownedpolish[i].tool == true) {
                            ownedaccessories.push(user.ownedpolish[i]);
                        } else {
                            ownedpolish.push(user.ownedpolish[i]);
                        }
                    }
                    var ownedCounts = {};
                    var ownedCompare = 0;
                    var ownedMostFrequent = "?";
                    for (i=0; i<ownedpolish.length; i++) {
                        if (ownedCounts[ownedpolish[i].brand] === undefined) {
                            ownedCounts[ownedpolish[i].brand] = 1;
                        } else {
                            ownedCounts[ownedpolish[i].brand] = ownedCounts[ownedpolish[i].brand] + 1;
                        }
                        if (ownedCounts[ownedpolish[i].brand] > ownedCompare) {
                            ownedCompare = ownedCounts[ownedpolish[i].brand];
                            ownedMostFrequent = ownedpolish[i].brand;
                        } else if (ownedCounts[ownedpolish[i].brand] == ownedCompare) {
                            ownedCompare = ownedCounts[ownedpolish[i].brand];
                            ownedMostFrequent = ownedMostFrequent + ", " + ownedpolish[i].brand;
                        }
                    }
                    data.ownedMostFrequent = ownedMostFrequent.split(",");
                    data.ownedpolish = ownedpolish;
                    data.ownedaccessories = ownedaccessories;
                    var wantedCounts = {};
                    var wantedCompare = 0;
                    var wantedMostFrequent = "?";
                    for (i=0; i<user.wantedpolish.length; i++) {
                        if (wantedCounts[user.wantedpolish[i].brand] === undefined) {
                            wantedCounts[user.wantedpolish[i].brand] = 1;
                        } else {
                            wantedCounts[user.wantedpolish[i].brand] = wantedCounts[user.wantedpolish[i].brand] + 1;
                        }
                        if (wantedCounts[user.wantedpolish[i].brand] > wantedCompare) {
                            wantedCompare = wantedCounts[user.wantedpolish[i].brand];
                            wantedMostFrequent = user.wantedpolish[i].brand;
                        } else if (wantedCounts[user.wantedpolish[i].brand] == wantedCompare) {
                            wantedCompare = wantedCounts[user.wantedpolish[i].brand];
                            wantedMostFrequent = wantedMostFrequent + ", " + user.wantedpolish[i].brand;
                        }
                    }
                    data.wantedMostFrequent = wantedMostFrequent.split(",");
                    // var colorCounts = {};
                    // var colorCompare = 0;
                    // var colorMostFrequent = "?";
                    // for (i=0; i<user.ownedpolish.length; i++) {
                    //     if (user.ownedpolish[i].colorsname) {
                    //         if (colorCounts[user.ownedpolish[i].colorsname[0]] === undefined) {
                    //             colorCounts[user.ownedpolish[i].colorsname[0]] = 1;
                    //         } else {
                    //             colorCounts[user.ownedpolish[i].colorsname[0]] = colorCounts[user.ownedpolish[i].colorsname[0]] + 1;
                    //         }
                    //         if (colorCounts[user.ownedpolish[i].colorsname[0]] > colorCompare) {
                    //             colorCompare = colorCounts[user.ownedpolish[0].colorsname[j]];
                    //             colorMostFrequent = user.ownedpolish[i].colorsname[0];
                    //         } else if (colorCounts[user.ownedpolish[i].colorsname[0]] == colorCompare) {
                    //             colorCompare = colorCounts[user.ownedpolish[i].colorsname[0]];
                    //             colorMostFrequent = colorMostFrequent + ", " + user.ownedpolish[i].colorsname[0];
                    //         }
                    //     }
                    // }
                    // data.colorMostFrequent = colorMostFrequent.split(",").map(function(x) {
                    //     for (i=0; i<PolishColors.length; i++) {
                    //         if (x.indexOf(PolishColors[i].name) > -1) {
                    //             return PolishColors[i].hex;
                    //         }
                    //     }
                    // })
                    res.render('main.ejs', data);
                })
            })
        })
    } else {
        res.render('main.ejs', {title: 'Lacquer Tracker'});
    }
});


app.get('/error', function(req, res) {
    res.render('error.ejs', {title: 'Oops! - Lacquer Tracker'});
});


};



//route middleware to make sure a user is logged in
function isLoggedIn(req, res, next) {

    if (req.isAuthenticated()) {
        User.findById(req.user.id).exec(function(err, user) {
            user.lastlogindate = new Date();
            if (user.ipaddress) {
                if (user.ipaddress.includes(req.header('X-Real-IP') || req.connection.remoteAddress) == false) {
                    user.ipaddress.push(req.header('X-Real-IP') || req.connection.remoteAddress);
                    if (user.ipaddress.length > 5) {
                        user.ipaddress.shift();
                    }
                }
            } else {
                user.ipaddress = [];
                user.ipaddress.push(req.header('X-Real-IP') || req.connection.remoteAddress);
            }
            user.save();
        })
    }

    //if user is authenticated in the session, carry on
    if (req.isAuthenticated())
    return next();

    //if they aren't, redirect them to the login page
    req.session.returnTo = req.path;
    res.redirect('/login');
};