//set up
var flash = require('connect-flash');
var express = require('express');
var http = require('http');
var mongoose = require('mongoose');
var autoIncrement = require('mongoose-auto-increment');
var passport = require('passport');
var d = require('domain').create();
var fs = require('fs');
var morgan = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var favicon = require('serve-favicon');
var methodOverride = require('method-override');
var session = require('express-session');
var timeout = require('connect-timeout');
var errorHandler = require('errorhandler');
var fileUpload = require('express-fileupload');

var app = express();

//configuration
mongoose.connect('mongodb://localhost:27017/lacquertracker', {useCreateIndex: true, useNewUrlParser: true, useUnifiedTopology: true}); // connect to database
var connection = mongoose.connection
autoIncrement.initialize(connection);
require(__dirname+'/app/passport')(passport); // pass passport for configuration

//set up express
app.set('port', process.env.LTPORT || 3000);
app.engine('html', require('ejs').renderFile);

app.enable('trust proxy');

app.get(function (req, res, next) {
	if ('/robots.txt' == req.url) {
    	res.type('text/plain')
    	res.send("User-agent: *\nDisallow: /admin\nDisallow: /email\nDisallow: /forums/*/add\nDisallow: /forums/*/edit\nDisallow: /forums/*/remove\nDisallow: /nailsoftheday/*/add\nDisallow: /nailsoftheday/*/edit\nDisallow: /nailsoftheday/*/remove\nDisallow: /photo\nDisallow: /swatch\nDisallow: /addown\nDisallow: /addwant\nDisallow: /addownbrowse\nDisallow: /addwantbrowse\nDisallow: /removeown\nDisallow: /removewant\nDisallow: /polish/*/delete\nDisallow: /polishedit\nDisallow: /profile/*/edit\nDisallow: /profile/*/remove\nDisallow: /profile/*/add\nDisallow: /profile/*/delete\nDisallow: /review\nDisallow: /validate\nDisallow: /revalidate\nDisallow: /reset\nDisallow: /logout\nDisallow: /scripts\nDisallow: /stylesheets\nDisallow: /polishsuccessful\nDisallow: /polishid");
	} else {
    	next();
	}
});

app.use(express.static(__dirname+'/public')); // Catch static files
app.use(morgan('dev')); // log every request to the console
var cookieSecret = process.env.LTCOOKIESECRET || "Development Cookie Secret";
app.use(cookieParser(cookieSecret)); // read cookies (needed for auth)
app.use(bodyParser({uploadDir:__dirname+'/public/images/tmp/'})); // get information from HTML forms
app.use(fileUpload({useTempFiles:true, tempFileDir:__dirname+'/public/images/tmp/', safeFileNames: true, preserveExtension:true}));
app.use(favicon(__dirname+'/public/images/lt.png'));
app.use(express.json());
app.use(express.urlencoded());
app.use(methodOverride());

app.use(session({secret:cookieSecret, cookie: {maxAge: 365 * 24 * 60 * 60 * 1000}, resave:true, saveUninitialized:false})); // session secret
app.use(flash()); // use connect-flash for flash messages stored in session
app.use(passport.initialize());
app.use(passport.session()); // persistent login sessions

app.use(function (req, res, next) {
    res.locals.user = req.user;
    res.locals.isAuthenticated = req.user != null;
    next();
});

app.use(timeout(10000));

/*error handling, but doesn't work anymore
app.use(function(req,res){
    res.redirect('/error');
});*/


// development only
if ('development' == app.get('env')) {
    app.use(errorHandler());
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