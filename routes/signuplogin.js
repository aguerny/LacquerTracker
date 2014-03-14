var Polish = require('../app/models/polish');
var User = require('../app/models/user');
var Review = require('../app/models/review');
var Photo = require('../app/models/photo');
var UserPhoto = require('../app/models/userphoto');
var Blog = require('../app/models/blog');
var BlogComment = require('../app/models/blogcomment');
var ForumPost = require('../app/models/forumpost');
var ForumComment = require('../app/models/forumcomment');
var mongoose = require('mongoose');
var fs = require('fs');
var path = require('path');
var nodemailer = require('nodemailer');
var sanitizer = require('sanitizer');
var markdown = require('markdown').markdown;
var _ = require('lodash');
var simple_recaptcha = require('simple-recaptcha');


module.exports = function(app, passport) {


//sign up
app.get('/signup', function(req, res) {
    res.render('signup.ejs', {title: 'Signup - Lacquer Tracker', message: req.flash('signupMessage')});
});

app.post('/signup', passport.authenticate('local-signup', {
    successRedirect: '/browse', //redirect to the secure profile section
    failureRedirect: '/profile', //redirect back to the signup page if there is an error
    failureFlash: true //allow flash messages
}));


///////////////////////////////////////////////////////////////////////////


//log in
app.get('/login', function(req, res) {
    res.render('login.ejs', {title: 'Login - Lacquer Tracker', message: req.flash('loginMessage')});
});

app.post('/login', passport.authenticate('local-login', {
    successReturnToOrRedirect: '/browse',
    failureRedirect: '/login',
    failureFlash: true
}));



///////////////////////////////////////////////////////////////////////////


//forgot password
app.get('/forgotpassword', function(req, res) {
    res.render('forgotpassword.ejs', {title: 'Retrieve Password - Lacquer Tracker'});
});


///////////////////////////////////////////////////////////////////////////


//log out
app.get('/logout', function(req, res) {
    req.logout();
    res.redirect('/');
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