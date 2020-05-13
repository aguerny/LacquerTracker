var Polish = require('../app/models/polish');
var User = require('../app/models/user');
var Review = require('../app/models/review');
var sanitizer = require('sanitizer');
var markdown = require('markdown-css');
var _ = require('lodash');

module.exports = function(app, passport) {


//add or edit review
app.get('/review/edit/:id', isLoggedIn, function(req, res) {
    var data = {};
    data.title = 'Edit Your Review - Lacquer Tracker';
    data.polish = req.params.id;
    data.user = req.user;

    Polish.findById(req.params.id).select('name brand').exec(function(err, polish) {
        data.polishname = polish.name;
        data.polishbrand = polish.brand;

        Review.findOne({polish: req.params.id, user:req.user.id}).exec(function(err, review) {
            if (review) { //if review already exists
                data.rating = review.rating;
                data.review = review.review;
                res.render('polish/review.ejs', data);
            } else { //the review doesn't exist yet.
                data.rating = "";
                data.review = "";
                res.render('polish/review.ejs', data);
            }
        })
    })
});

app.post('/review/edit/:id', isLoggedIn, function(req, res) {
    Polish.findById(req.params.id, function(err, polish) {
        var polishname = polish.name;
        var polishbrand = polish.brand;

        Review.findOne({polish: req.params.id, user:req.user.id}, function(err, review) {
        if (review) { //if review already exists
            review.rating = sanitizer.sanitize(req.body.rating);
            review.review = sanitizer.sanitize(req.body.review);
            review.save(function(err) {
                polish.dateupdated = new Date();
                polish.save(function(err) {
                    Review.find({polish: req.params.id}, function (err, reviews) {
                        var ratings = reviews.map(function(x) {
                            if (x.rating.length > 0) {
                                return parseInt(x.rating);
                            }
                        })
                        polish.avgrating = _.mean(ratings);
                        polish.save(function(err) {
                            res.redirect('/polish/' + polishbrand.replace(/ /g,"_") + "/" + polishname.replace(/ /g,"_"));
                        })
                    })
                })
            });
        } else {
            var newReview = new Review ({
                polish: req.params.id,
                user: req.user.id,
                rating: sanitizer.sanitize(req.body.rating),
                review: sanitizer.sanitize(req.body.review),
                notes: '',
            });
            newReview.save(function(err) {
                polish.dateupdated = new Date();
                polish.reviews.push(newReview.id);
                polish.save(function(err) {
                    Review.find({polish: req.params.id}, function (err, reviews) {
                        var ratings = reviews.map(function(x) {
                            if (x.rating.length > 0) {
                                return parseInt(x.rating);
                            }
                        })
                        polish.avgrating = _.mean(ratings);
                        polish.save(function(err) {
                            res.redirect('/polish/' + polishbrand.replace(/ /g,"_") + "/" + polishname.replace(/ /g,"_"));
                        })
                    })
                })
            });
            }
        })
    })
});




//add or edit notes
app.get('/notes/edit/:id', isLoggedIn, function(req, res) {
    var data = {};
    data.title = 'Edit Your Notes - Lacquer Tracker';
    data.polish = req.params.id;
    data.user = req.user;

    Polish.findById(req.params.id).select('name brand').exec(function(err, polish) {
        data.polishname = polish.name;
        data.polishbrand = polish.brand;

        Review.findOne({polish: req.params.id, user:req.user.id}).exec(function(err, review) {
            if (review) { //if review already exists
                data.notes = review.notes;
                res.render('polish/notes.ejs', data);
            } else { //the review doesn't exist yet.
                data.notes = "";
                res.render('polish/notes.ejs', data);
            }
        })
    })
});


app.post('/notes/edit/:id', isLoggedIn, function(req, res) {
    Polish.findById(req.params.id, function(err, polish) {
        var polishname = polish.name;
        var polishbrand = polish.brand;

        Review.findOne({polish: req.params.id, user:req.user.id}, function(err, review) {
        if (review) { //if review already exists
            review.notes = sanitizer.sanitize(req.body.notes);
            review.save(function(err) {
                polish.save(function(err) {
                    res.redirect('/polish/' + polishbrand.replace(/ /g,"_") + "/" + polishname.replace(/ /g,"_"));
                })
            });
        } else {
            var newReview = new Review ({
                polish: req.params.id,
                user: req.user.id,
                rating: '',
                review: '',
                notes: sanitizer.sanitize(req.body.notes),
            });
            newReview.save(function(err) {
                polish.reviews.push(newReview.id);
                polish.save(function(err) {
                    res.redirect('/polish/' + polishbrand.replace(/ /g,"_") + "/" + polishname.replace(/ /g,"_"));
                })
            });
            }
        })
    })
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