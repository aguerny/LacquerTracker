//set up
var flash = require('connect-flash');
var express = require('express');
var http = require('http');
var path = require('path');
var mongoose = require('mongoose');
var passport = require('passport');
var fs = require('fs');
var nodemailer = require('nodemailer');
var sanitizer = require('sanitizer');
var markdown = require('markdown').markdown;
var _ = require('lodash');
var simple_recaptcha = require('simple-recaptcha');
var pagedown = require("pagedown");
var converter = new pagedown.Converter();
var safeConverter = pagedown.getSanitizingConverter();
var pagedown = require("pagedown");
var safeConverter = pagedown.getSanitizingConverter();
var bycrypt = require("bcrypt-nodejs");

var app = express();

//configuration
mongoose.connect('localhost/test'); // connect to database
require('./app/passport')(passport); // pass passport for configuration

app.configure(function() {

	//set up express
	app.set('port', process.env.PORT || 3000);
	app.set('views', __dirname + '/views');
	app.engine('html', require('ejs').renderFile);

	app.use(express.static(path.join(__dirname, '/public')));
	app.use(express.static(__dirname+'/public')); // Catch static files
	app.use(express.logger('dev')); // log every request to the console
	app.use(express.cookieParser('lala')); // read cookies (needed for auth)
	app.use(express.bodyParser({uploadDir:'./public/images/tmp/'})); // get information from HTML forms
	//other from previous files
	app.use(express.favicon('./public/images/lt.png'));
	app.use(express.json());
	app.use(express.urlencoded());
	app.use(express.methodOverride());


	//required for passport
	app.use(express.session({cookie: {maxAge: 365 * 24 * 60 * 60 * 1000}})); // session secret
	app.use(flash()); // use connect-flash for flash messages stored in session
	app.use(passport.initialize());
	app.use(passport.session()); // persistent login sessions

	app.use(function (req, res, next) {
    res.locals({
        get user() { // as a getter to delay retrieval until `res.render()`
            return req.user;
        },
        isAuthenticated: function () {
            return req.user != null;
        }
    })
    	next();
	});

	//other old ones
	app.use(app.router);

});


// development only
if ('development' == app.get('env')) {
  app.use(express.errorHandler());
}


//routes
require('./routes/index.js')(app, passport); // load our routes and pass in our app and fully configured passport


//launch
http.createServer(app).listen(app.get('port'), function(){
  console.log('Express server listening on port ' + app.get('port'));
});