//set up
var flash = require('connect-flash');
var express = require('express');
var http = require('http');
var mongoose = require('mongoose');
var autoIncrement = require('mongoose-auto-increment');
var passport = require('passport');
var cluster = require('cluster');

var app = express();

//configuration
var connection = mongoose.connect('localhost/test'); // connect to database
autoIncrement.initialize(connection);
require('./app/passport')(passport); // pass passport for configuration

app.configure(function() {

	//set up express
	app.set('port', process.env.PORT || 3000);
	app.engine('html', require('ejs').renderFile);

	app.use(express.static(__dirname+'/public')); // Catch static files
	/*app.use(express.logger('dev')); // log every request to the console*/
	app.use(express.cookieParser('lala')); // read cookies (needed for auth)
	app.use(express.bodyParser({uploadDir:'./public/images/tmp/'})); // get information from HTML forms
	app.use(express.favicon('./public/images/lt.png'));
	app.use(express.json());
	app.use(express.urlencoded());
	app.use(express.methodOverride());

	app.use(express.session({cookie: {maxAge: 365 * 24 * 60 * 60 * 1000}})); // session secret
	app.use(flash()); // use connect-flash for flash messages stored in session
	app.use(passport.initialize());
	app.use(passport.session('lalala')); // persistent login sessions

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
if (cluster.isMaster) {
	cluster.fork();
	cluster.fork();

	cluster.on('disconnect', function(worker) {
    	console.error('disconnect!');
		cluster.fork();
  	});

} else {

	var domain = require('domain');

	var server = require('http').createServer(app, function(req, res) {
    	var d = domain.create();
    	d.on('error', function(er) {
      		console.error('error', er.stack);

			// Note: we're in dangerous territory!
			// By definition, something unexpected occurred,
			// which we probably didn't want.
			// Anything can happen now!  Be very careful!

      	try {
        	// make sure we close down within 30 seconds
        	var killtimer = setTimeout(function() {
          		process.exit(1);
        	}, 30000);
        	// But don't keep the process open just for that!
        	killtimer.unref();

        	// stop taking new requests.
       		server.close();

        	// Let the master know we're dead.  This will trigger a
        	// 'disconnect' in the cluster master, and then it will fork
        	// a new worker.
        	cluster.worker.disconnect();

        	// try to send an error to the request that triggered the problem
        	res.statusCode = 500;
        	res.setHeader('content-type', 'text/plain');
        	res.end('Oops, there was a problem!\n');
      	} catch (er2) {

        // oh well, not much we can do at this point.
        console.error('Error sending 500!', er2.stack);
      	}
    });

    // Because req and res were created before this domain existed,
    // we need to explicitly add them.
    // See the explanation of implicit vs explicit binding below.
    d.add(req);
    d.add(res);

    // Now run the handler function in the domain.
    d.run(function() {
		handleRequest(req, res);
	});
	});

server.listen(app.get('port'));

}