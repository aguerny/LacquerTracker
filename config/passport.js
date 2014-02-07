//load all the things we need
var LocalStrategy = require('passport-local').Strategy;

//load up the user model
var User = require('../app/models/user');

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

	//local signup=======================================
	//we are using named strategies since we have one for login and one for signup
	//by default, if there was no name, it would just be called 'local'

	passport.use('local-signup', new LocalStrategy({
		usernameField: 'username',
		passwordField: 'password',
		passReqToCallback: true //allows us to pass back the enture request to the callback
	},
	function(req, username, password, done) {

		//asynchronous
		//User.findOne won't fire unless data is sent back
		process.nextTick(function() {

			//find a user whose username is the same as the form's username
			//we are checking to see if the user trying to login already exists
			User.findOne({ 'username' : username}, function(err, user) {
				//if there are any errors, return the error
				if (err)
					return done(err);

				//check to see if there's already a user with that email
				if (user) {
					return done(null, false, req.flash('signupMessage', 'That username is already taken.'));
				} else {

					//if there is no user with that username
					//create the user
					var newUser = new User();

					//set the user's local credentials
					newUser.username = username;
					newUser.password = newUser.generateHash(password);

					//save the user
					newUser.save(function(err) {
						if (err)
							throw err;
						return done(null, newUser);
					});
				}
			});
		});
	}));


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
		User.findOne({ 'username' : username}, function(err, user) {
			//if there are any errors, return the error before anything else
			if (err)
				return done(err);

			//if no user is found, return the message
			if (!user)
				return done(null, false, req.flash('loginMessage', 'No such user found.'));

			//if the user is found but the password is wrong
			if (!user.validPassword(password))
				return done(null, false, req.flash('loginMessage', 'Oops! Wrong password.'));

			//all is well, return successful user
			return done(null, user);
		});
	}));
};