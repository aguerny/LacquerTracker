//set up
var flash = require('connect-flash');
var express = require('express');
var http = require('http');
var path = require('path');
var mongoose = require('mongoose');
var autoIncrement = require('mongoose-auto-increment');
var passport = require('passport');

var app = express();

//configuration
var connection = mongoose.connect('localhost/test'); // connect to database
autoIncrement.initialize(connection);
require('./app/passport')(passport); // pass passport for configuration

app.configure(function() {

	//set up express
	app.set('port', process.env.PORT || 3000);
	app.engine('html', require('ejs').renderFile);
	app.set('views', __dirname + '/views');

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

	app.use(app.router);
	app.use(function(req,res){
   		res.redirect('/error');
	});

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