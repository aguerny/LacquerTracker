var User = require('../app/models/user');
var PolishColors = require('../app/constants/polishColors');

module.exports = function(app, passport) {


app.get('/', function(req, res) {
    //console.log(req.headers['x-real-ip'] || req.connection.remoteAddress);
    if (req.isAuthenticated()) {
        data = {};
        data.title = 'Lacquer Tracker';
        User.findById(req.user.id).populate('ownedpolish', 'brand colorsname').populate('wantedpolish', 'brand').exec(function(err, user) {
            var ownedCounts = {};
            var ownedCompare = 0;
            var ownedMostFrequent = "?";
            for (i=0; i<user.ownedpolish.length; i++) {
                if (ownedCounts[user.ownedpolish[i].brand] === undefined) {
                    ownedCounts[user.ownedpolish[i].brand] = 1;
                } else {
                    ownedCounts[user.ownedpolish[i].brand] = ownedCounts[user.ownedpolish[i].brand] + 1;
                }
                if (ownedCounts[user.ownedpolish[i].brand] > ownedCompare) {
                    ownedCompare = ownedCounts[user.ownedpolish[i].brand];
                    ownedMostFrequent = user.ownedpolish[i].brand;
                } else if (ownedCounts[user.ownedpolish[i].brand] == ownedCompare) {
                    ownedCompare = ownedCounts[user.ownedpolish[i].brand];
                    ownedMostFrequent = ownedMostFrequent + ", " + user.ownedpolish[i].brand;
                }
            }
            data.ownedMostFrequent = ownedMostFrequent.split(",");
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