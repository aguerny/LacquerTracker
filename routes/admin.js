var User = require('../app/models/user');
var moment = require('moment-timezone');
var Polish = require('../app/models/polish');
var Photo = require('../app/models/photo');
var fs = require('node-fs');
var path = require('path');
var Review = require('../app/models/review');

module.exports = function(app, passport) {


//admin user page
app.get('/admin/users', isLoggedIn, function(req, res) {
    if (req.user.level === "admin") {
        User.find({}).sort('usernumber').exec(function(err, users) {
            var users = users.map(function(x) {
                x.creationdate = moment(x.creationdate).tz("America/New_York").format('M-D-YY, h:mm a');
                return x;
            })
            res.render('admin/users.ejs', {title: 'All Users - Lacquer Tracker', allusers: users});
        })
    } else {
        res.redirect('/error');
    }
});



//photos pending delete
app.get('/admin/pending', isLoggedIn, function(req, res) {
    if (req.user.level === "admin") {
        Photo.find({pendingdelete:true}).exec(function(err, photos) {
            data = {};
            data.title = 'Photos Pending Delete - Lacquer Tracker';
            data.pendingphotos = photos;
            res.render('admin/pending.ejs', data);
        })
    } else {
        res.redirect('/error');
    }
});


//remove pending photo
app.get('/admin/pending/:pid/:id/:action', isLoggedIn, function(req, res) {
    Photo.findById(req.params.id).exec(function(err, photo) {
        if (photo === null || photo === undefined) {
            res.redirect('/error');
        } else {
            if (req.params.action === "restore") {
                photo.pendingdelete = false;
                photo.save(function(err) {
                    res.redirect('/admin/pending');
                })
            } else if (req.params.action === "remove") {
                fs.unlink('./public' + photo.location, function(err) {
                    if (err) throw err;
                })
                photo.remove();
                Polish.findById(req.params.pid, function(err, p) {
                    p.photos.remove(req.params.id);
                    p.save(function(err) {
                        res.redirect('/admin/pending');
                    });
                })
            } else {
                res.redirect('/error');
            }
        }
    });
});


//admin duplicate polishes
app.get('/admin/duplicate', isLoggedIn, function(req, res) {
    if (req.user.level === "admin") {
        Photo.find({pendingdelete:true}).exec(function(err, photos) {
            data = {};
            data.title = 'Photos Pending Delete - Lacquer Tracker';
            data.pendingphotos = photos;
            res.render('admin/pending.ejs', data);
        })
    } else {
        res.redirect('/error');
    }
});

app.post('/admin/duplicate', isLoggedIn, function(req, res) {
    if (req.user.level === "admin") {
        var allowners = [];
        var allwanters = [];
        var allphotos = [];
        var allreviews = [];
        Polish.find({name:req.body.polishname, brand:req.body.polishbrand}, function(err, polishes) {
            for (i=0; i < polishes.length; i++) {
                User.find({ownedpolish:polishes[i].id}, function(err, users) {
                    for (j=0; j<users.length; j++) {
                        allowners.push(users[j]);
                    }
                })
                User.find({wantedpolish:polishes[i].id}, function(err, users) {
                    for (j=0; j<users.length; j++) {
                        allwanters.push(users[j]);
                    }
                })
                Photos.find({polishid:polishes[i].id}, function(err, photos) {
                    for (j=0; j<photos.length; j++) {
                        allphotos.push(photos[j]);
                    }
                })
                Review.find({polishid:polishes[i].id}, function(err, reviews) {
                    for (j=0; j<reviews.length; j++) {
                        allreviews.push(reviews[j]);
                    }
                })
            }


        })
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