//load all the things we need
var LocalStrategy = require('passport-local').Strategy;

//load up the user model
var User = require('../app/models/user');

var sanitizer = require('sanitizer');
var simple_recaptcha = require('simple-recaptcha');
var nodemailer = require('nodemailer');

//expose this function to our app using modeule.exports
module.exports = function(passport) {

	//passport session setup=============================
	//required for persistent login sessions
	//passport needs ability to serialize and unserialize users out of session

	passport.serializeUser(function(user, done) {
		done(null, user.id);
	});

	passport.deserializeUser(function(id, done) {
		User.findById(id, function(err, user) {
			done(err, user);
		});
	});


	//local login========================================
	//we are using named strategies since we have one for login and one for signup
	//by default, if there was no name, it would just be called 'local'

	passport.use('local-login', new LocalStrategy({
		usernameField: 'username',
		passwordField: 'password',
		passReqToCallback: true //allows us to pass back the entire request to the callback
	},

	function(req, username, password, done) {//callback with the username and password from our form

		//find a user who username is the same as the form's username
		//we are checking to see if the user trying to login already exists
		User.findOne({ 'username' : username.toLowerCase()}, function(err, user) {
			//if there are any errors, return the error before anything else
			if (err)
				return done(err);

			//if no user is found, return the message
			if (!user)
				return done(null, false, req.flash('loginMessage', 'Wrong username or password combination.'));

			//if the user is found but the password is wrong
			if (!user.validPassword(password))
				return done(null, false, req.flash('loginMessage', 'Wrong username or password combination.'));

			//if user has not validated yet
			if (user.isvalidated === false) {
				return done(null, false, req.flash('loginMessage', 'Your account has not yet been validated. Please check your email or have another code sent to you at: http://lacquertracker.com/revalidate'));
			} else {
				return done(null, user);
			}
		});
	}));
};