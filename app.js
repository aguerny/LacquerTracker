//set up
var flash = require('connect-flash');
var express = require('express');
var http = require('http');
var mongoose = require('mongoose');
var autoIncrement = require('mongoose-auto-increment');
var passport = require('passport');
var d = require('domain').create();
var fs = require('fs');

var app = express();

//configuration
var connection = mongoose.connect('localhost/lacquertracker'); // connect to database
autoIncrement.initialize(connection);
require(__dirname+'/app/passport')(passport); // pass passport for configuration

app.configure(function() {

	//set up express
	app.set('port', process.env.PORT || 3000);
	app.engine('html', require('ejs').renderFile);

    app.enable('trust proxy');

    app.use(function (req, res, next) {
    	if ('/robots.txt' == req.url) {
        	res.type('text/plain')
        	res.send("User-agent: *\nDisallow: /admin\nDisallow: /blog/add\nDisallow: /blog/*/add\nDisallow: /blog/*/*/add\nDisallow: /blog/*/*/remove\nDisallow: /blog/*/*/removepermanent\nDisallow: /blog/*/edit\nDisallow: /email\nDisallow: /forums/*/add\nDisallow: /forums/*/*/*/add\nDisallow: /forums/*/*/edit\nDisallow: /forums/*/*/add\nDisallow: /forums/*/*/*/remove\nDisallow: /forums/*/*/*/removepermanent\nDisallow: /forums/*/*/remove\nDisallow: /photo\nDisallow: /swatch\nDisallow: /addown\nDisallow: /addwant\nDisallow: /addownbrowse\nDisallow: /addwantbrowse\nDisallow: /removeown\nDisallow: /removewant\nDisallow: /polish/*/*/delete\nDisallow: /profile/edit\nDisallow: /profile/*/edit\nDisallow: /profile/*/*/remove\nDisallow: /profile/*/*/add\nDisallow: /profile/*/*/delete\nDisallow: /review\nDisallow: /validate\nDisallow: /revalidate\nDisallow: /reset\nDisallow: /logout\nDisallow: /scripts\nDisallow: /stylesheets\nDisallow: /polishsuccessful");
    	} else {
        	next();
    	}
	});

	app.use(express.static(__dirname+'/public')); // Catch static files
	app.use(express.logger('dev')); // log every request to the console
	/*app.use(express.logger({format: 'dev', stream: fs.createWriteStream('app.log', {'flags': 'w'})}));*/
	app.use(express.cookieParser('lala')); // read cookies (needed for auth)
	app.use(express.bodyParser({uploadDir:__dirname+'/public/images/tmp/'})); // get information from HTML forms
	app.use(express.favicon(__dirname+'/public/images/lt.png'));
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

	app.use(express.timeout(10000));
	
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
require(__dirname+'/routes/index.js')(app, passport); // load our routes and pass in our app and fully configured passport


//launch
d.on('error', function(er) {
    console.log('Error!', er.message);
});

d.run(function() {
    http.createServer(app).listen(app.get('port'), function(){
        console.log('Express server listening on port ' + app.get('port'));
    });
});