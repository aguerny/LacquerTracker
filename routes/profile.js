var Polish = require('../app/models/polish');
var User = require('../app/models/user');
var Review = require('../app/models/review');
var Photo = require('../app/models/photo');
var UserPhoto = require('../app/models/userphoto');
var sanitizer = require('sanitizer');
var markdown = require('markdown-css');
var _ = require('lodash');


module.exports = function(app, passport) {


//profile general
app.get('/profile', isLoggedIn, function(req, res) {
    var username = req.user.username;
    res.redirect('/profile/' + username);
});


//profile specific
app.get('/profile/:username', function(req, res) {
    User.findOne({username: req.params.username}).populate('photos').populate('ownedpolish').populate('wantedpolish').exec(function(err, user) {
        if (!user || user.username==="admin" || user.username==="lacquertracker") {
            res.redirect('/error');
        } else {
            var data = {};
            data.title = 'Profile - Lacquer Tracker';
            data.opolishes = user.ownedpolish;
            data.wpolishes = user.wantedpolish;
            data.username = user.username;
            data.about = sanitizer.sanitize(markdown(user.about));
            data.profilephoto = user.profilephoto;
            data.notifications = user.notifications;
            data.useremail = user.useremail;
            yesphotos = [];
            for (i=0; i < user.photos.length; i++) {
                if (user.photos[i].onprofile === "yes") {
                    yesphotos.push(user.photos[i]);
                }
            }
            data.photos = _.shuffle(yesphotos);
            var oreviews = [];
            Review.find({user:user.id}, function(err, reviews) {
                for (i=0; i<reviews.length; i++) {
                    var thisindex = _.findIndex(user.ownedpolish, {'id':reviews[i].polishid});
                    oreviews[thisindex] = reviews[i];
                }
                data.oreviews = oreviews;
                res.render('profile.ejs', data);
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
            for (i=0; i < user.photos.length; i++) {
                if (user.photos[i].onprofile === "yes") {
                    yesphotos.push(user.photos[i]);
                } else if (user.photos[i].onprofile === "no") {
                    nophotos.push(user.photos[i]);
                }
            }
            data.yesphotos = yesphotos;
            data.nophotos = nophotos;
        res.render('profileedit.ejs', data);
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


app.get('/profile/:username/:id/remove', isLoggedIn, function(req, res) {
    if (req.user.username == req.params.username) {
        UserPhoto.findById(req.params.id, function(err, photo) {
            photo.onprofile = "no";
            photo.save();
            res.redirect('/profile/' + req.user.username + '/edit');
        })
    } else {
        res.redirect('/error');
    }
});


app.get('/profile/:username/:id/add', isLoggedIn, function(req, res) {
    if (req.user.username == req.params.username) {
        UserPhoto.findById(req.params.id, function(err, photo) {
            photo.onprofile = "yes";
            photo.save();
            res.redirect('/profile/' + req.user.username + '/edit');
        })
    } else {
        res.redirect('/error');
    }
});


app.get('/profile/:username/:id/delete', isLoggedIn, function(req, res) {
    if (req.user.username == req.params.username) {
        req.user.photos.remove(req.params.id);
        req.user.save();
        res.redirect('/profile/' + req.user.username + '/edit');
    } else {
        res.redirect('/error');
    }
});


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