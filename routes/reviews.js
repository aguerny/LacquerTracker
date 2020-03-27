var Polish = require('../app/models/polish');
var User = require('../app/models/user');
var Review = require('../app/models/review');
var sanitizer = require('sanitizer');
var markdown = require('markdown-css');

module.exports = function(app, passport) {


//add or edit review
app.get('/review/edit/:id', isLoggedIn, function(req, res) {
    var data = {};
    data.title = 'Edit Your Review - Lacquer Tracker';
    data.polishid = req.params.id;
    data.user = req.user;

    Polish.findById(req.params.id, function(err, polish) {
        data.polishname = polish.name;
        data.polishbrand = polish.brand;

        Review.findOne({polishid: req.params.id, user:req.user.id}).exec(function(err, review) {
            if (review) { //if review already exists
                data.rating = review.rating;
                data.userreview = review.userreview;
                data.notes = review.notes;
                res.render('polish/reviewedit.ejs', data);
            } else { //the review doesn't exist yet.
                data.rating = "";
                data.userreview = "";
                data.notes = "";
                res.render('polish/reviewedit.ejs', data);
            }
        })
    })
});


app.post('/review/edit/:id', isLoggedIn, function(req, res) {
    Polish.findById(req.params.id, function(err, polish) {
        var polishname = polish.name;
        var polishbrand = polish.brand;

        Review.findOne({polishid: req.params.id, user:req.user.id}, function(err, review) {
        if (review) { //if review already exists
            review.rating = req.body.rating;
            review.userreview = sanitizer.sanitize(req.body.userreview);
            review.notes = sanitizer.sanitize(req.body.notes);
            review.save(function(err) {
                polish.dateupdated = new Date();
                polish.save(function(err) {
                    res.redirect('/polish/' + polishbrand.replace(/ /g,"_") + "/" + polishname.replace(/ /g,"_"));
                })
            });
        } else {
            var newReview = new Review ({
                polishid: req.params.id,
                user: req.user.id,
                rating: req.body.rating,
                userreview: sanitizer.sanitize(req.body.userreview),
                notes: sanitizer.sanitize(req.body.notes),
            });
            newReview.save(function(err) {
                polish.dateupdated = new Date();
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

    //if user is authenticated in the session, carry on
    if (req.isAuthenticated())
    return next();

    //if they aren't, redirect them to the login page
    req.session.returnTo = req.path;
    res.redirect('/login');
};