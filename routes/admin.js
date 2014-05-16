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
            res.render('admin/duplicate.ejs', data);
        })
    } else {
        res.redirect('/error');
    }
});

app.post('/admin/duplicate', isLoggedIn, function(req, res) {
    if (req.user.level === "admin") {
        Polish.find({name:req.body.polishname, brand:req.body.polishbrand}, function(err, polishes) {
            console.log(polishes);
            for (i=0; i < polishes.length; i++) {
                User.find({ownedpolish:polishes[i].id}, function(err, users) {
                    for (j=0; j<users.length; j++) {
                        users[j].ownedpolish.remove(polishes[i].id);
                        users[j].ownedpolish.addToSet(polishes[0].id);
                        users[j].save();
                    }
                })
                User.find({wantedpolish:polishes[i].id}, function(err, users) {
                    for (j=0; j<users.length; j++) {
                        users[j].wantedpolish.remove(polishes[i].id);
                        users[j].wantedpolish.addToSet(polishes[0].id);
                        users[j].save();
                    }
                })
                Photo.find({polishid:polishes[i].id}, function(err, photos) {
                    for (j=0; j<photos.length; j++) {
                        photos[j].polishid = polishes[0].id;
                        photos[j].save();
                        polishes[0].photos.addToSet(photos[j].id);
                        polishes[0].save();
                    }
                })
                Review.find({polishid:polishes[i].id}, function(err, reviews) {
                    for (j=0; j<reviews.length; j++) {
                        reviews[j].polishid = polishes[0].id;
                        reviews[j].save();
                    }
                })
            }
            if (!polishes[0].batch.length) {
                for (i=1; i<polishes.length; i++) {
                    if (polishes[i].batch.length) {
                        polishes[0].batch = polishes[i].batch;
                        polishes[0].keywords = polishes[0].name.replace(/[?]/g,"").replace(/[&]/g,"and").replace(/[\/]/g,"-") + " " + polishes[0].brand.replace(/[?]/g,"").replace(/[&]/g,"and").replace(/[\/]/g,"-") + " " + polishes[0].batch + " " + polishes[0].code;
                        polishes[0].save();
                    }
                }
            }
            if (!polishes[0].code.length) {
                for (i=1; i<polishes.length; i++) {
                    if (polishes[i].code.length) {
                        polishes[0].code = polishes[i].code;
                        polishes[0].keywords = polishes[0].name.replace(/[?]/g,"").replace(/[&]/g,"and").replace(/[\/]/g,"-") + " " + polishes[0].brand.replace(/[?]/g,"").replace(/[&]/g,"and").replace(/[\/]/g,"-") + " " + polishes[0].batch + " " + polishes[0].code;
                        polishes[0].save();
                    }
                }
            }
            if (!polishes[0].colorcat.length) {
                for (i=1; i<polishes.length; i++) {
                    if (polishes[i].colorcat.length) {
                        polishes[0].colorcat = polishes[i].colorcat;
                        polishes[0].save();
                    }
                }
            }
            if (!polishes[0].type.length) {
                for (i=1; i<polishes.length; i++) {
                    if (polishes[i].type.length) {
                        polishes[0].type = polishes[i].type;
                        polishes[0].save();
                    }
                }
            }
            if (!polishes[0].indie.length) {
                for (i=1; i<polishes.length; i++) {
                    if (polishes[i].indie.length) {
                        polishes[0].indie = polishes[i].indie;
                        polishes[0].save();
                    }
                }
            }
            if (!polishes[0].dupes.length) {
                for (i=1; i<polishes.length; i++) {
                    if (polishes[i].dupes.length) {
                        polishes[0].dupes = polishes[i].dupes;
                        polishes[0].save();
                    }
                }
            }
            if (!polishes[0].swatch.length) {
                for (i=1; i<polishes.length; i++) {
                    if (polishes[i].swatch.length) {
                        polishes[0].swatch = polishes[i].swatch;
                        polishes[0].save();
                    }
                }
            }
            res.redirect('/browse');
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