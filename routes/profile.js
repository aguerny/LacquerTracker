var Polish = require('../app/models/polish');
var User = require('../app/models/user');
var Review = require('../app/models/review');
var Photo = require('../app/models/photo');
var UserPhoto = require('../app/models/userphoto');
var Checkin = require('../app/models/checkin');
var sanitizer = require('sanitizer');
var markdown = require('markdown-css');
var _ = require('lodash');
var PolishColors = require('../app/constants/polishColors');


module.exports = function(app, passport) {


//profile general
app.get('/profile', isLoggedIn, function(req, res) {
    User.findOne({username: req.user.username}, function (err, user) {
        user.lastlogindate = new Date;
        user.save(function(err) {
            var username = req.user.username;
            res.redirect('/profile/' + username);
        })
    })
});


//profile specific
app.get('/profile/:username', function(req, res) {
    User.findOne({username: req.params.username}).populate('photos').populate('checkins').populate('ownedpolish').populate('wantedpolish').exec(function(err, user) {
        if (!user || user.username==="admin" || user.username==="lacquertracker") {
            res.redirect('/error');
        } else {
            Checkin.find({user:user}, function(err, checkin) {
                var data = {};
                data.title = user.username + "'s Profile - Lacquer Tracker";
                var osort = user.ownedpolish.sort(function (a, b) {return a.name.toLowerCase().localeCompare(b.name.toLowerCase());});
                var osort2 = _.sortBy(osort, function(b) {return b.brand.toLowerCase();});
                var wsort = user.wantedpolish.sort(function (a, b) {return a.name.toLowerCase().localeCompare(b.name.toLowerCase());});
                var wsort2 = _.sortBy(wsort, function(b) {return b.brand.toLowerCase();});
                data.opolishes = osort2;
                data.wpolishes = wsort2;
                data.username = user.username;
                data.about = markdown(user.about);
                data.profilephoto = user.profilephoto;
                data.notifications = user.notifications;
                data.useremail = user.useremail;
                data.colors = PolishColors;
                data.checkins = checkin;
                var oreviews = [];
                Review.find({user:user.id}, function(err, reviews) {
                    for (i=0; i<reviews.length; i++) {
                        var thisindex = _.findIndex(osort2, {'id':reviews[i].polishid});
                        oreviews[thisindex] = reviews[i];
                    }
                    data.oreviews = oreviews;
                    res.render('profile/profile.ejs', data);
                })
            })
        }
    });
});

///////////////////////////////////////////////////////////////////////////


//edit profile
app.get('/profile/edit', isLoggedIn, function(req, res) {
    var usernamee = req.user.username;
    res.redirect('/profile/edit/' + usernamee);
});


app.get('/profile/:username/edit', isLoggedIn, function(req, res) {
    if (req.params.username === req.user.username) {
        User.findOne({username : req.params.username}).populate('photos').exec(function(err, user) {
        var data = {};
            data.title = 'Edit Your Profile - Lacquer Tracker';
            data.userid = user.id;
            data.username = user.username;
            data.email = user.email;
            data.about = user.about;
            yesphotos = [];
            nophotos = [];
            data.notifications = user.notifications;
            data.useremail = user.useremail;
            data.country = user.country;
            data.timezone = user.timezone;
        res.render('profile/profileedit.ejs', data);
        })
    } else {
        res.redirect('/error');
    }
});

app.post('/profile/:username/edit', isLoggedIn, function(req, res) {
    User.findOne({username:req.params.username}, function(err, user) {
        if (!user) {
            res.redirect('/error');
        } else {
            user.email = sanitizer.sanitize(req.body.email);
            user.about = sanitizer.sanitize(req.body.about);
            user.country = req.body.country;
            user.timezone = req.body.timezone;
            if (req.body.notifications) {
                user.notifications = req.body.notifications;
            } else {
                user.notifications = "off";
            }
            if (req.body.useremail) {
                user.useremail = req.body.useremail;
            } else {
                user.useremail = "off";
            }
            user.save(function(err) {
                res.redirect('/profile/' + req.user.username);
            });
        }
    });
});


//delete profile
    //TO-DO


};



//route middleware to make sure a user is logged in
function isLoggedIn(req, res, next) {

    //if user is authenticated in the session, carry on
    if (req.isAuthenticated())
    return next();

    //if they aren't, redirect them to the login page
    req.session.returnTo = req.path;
    res.redirect('/login');
};