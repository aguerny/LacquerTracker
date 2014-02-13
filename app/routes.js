var Polish = require('../app/models/polish');
var User = require('../app/models/user');
var mongoose = require('mongoose');

module.exports = function(app, passport) {

///////////////////////////////////////////////////////////////////////////


//home page
app.get('/', function(req, res) {
	res.render('main.ejs', {title: 'Lacquer Tracker'});
});


///////////////////////////////////////////////////////////////////////////


//browse
app.get('/browse', function(req, res) {
	Polish.find({})
		.limit(10)
		.exec(function (err, docs) {
			var newDocs = docs.map(function(idoc){
				if (req.isAuthenticated() && req.user.ownedpolish.some(function (id) {return id === idoc.id})) {
					var options = "Owned | <a href=/editpolish/" + idoc.id + ">Edit</a>";
				} else if (req.isAuthenticated() && req.user.wantedpolish.some(function (id) {return id === idoc.id})) {
					var options = "Wanted | <a href=/browse/addown/" + idoc.id + ">Own</a> | <a href=/editpolish/" + idoc.id + ">Edit</a>";
				} else {
					var options = "<a href=/browse/addown/" + idoc.id + ">Own</a> | <a href=/browse/addwant/" + idoc.id + ">Want</a> | <a href=/editpolish/" + idoc.id + ">Edit</a>";
				}
				return "<tr><td>"+idoc.name+"</td><td>" + idoc.brand + "</td><td>" + idoc.batch + "</td><td><div id='swatch' style='background-color:" + idoc.colorhex + ";'>&nbsp;</div></td><td>" + idoc.type + "</td><td>" + options + "</td></tr>";
			})
		res.render('browse.ejs', {title: 'Browse - Lacquer Tracker', polishes:  newDocs });
	});
});


app.post('/browse', function(req, res) {
	var filterOptions = req.body;
	console.log(filterOptions);
	for(var key in filterOptions) {
		if(filterOptions.hasOwnProperty(key)) {
			filterOptions[key] = new RegExp(filterOptions[key], "i");
		}
	}

	Polish.find(filterOptions , function (err, docs) {
		console.log(docs);
		var polishItems = [];
		var newDocs = docs.map(function(idoc){
			if (req.isAuthenticated() && req.user.ownedpolish.some(function (id) {return id === idoc.id})) {
					var options = "Owned | <a href=/editpolish/" + idoc.id + ">Edit</a>";
			} else if (req.isAuthenticated() && req.user.wantedpolish.some(function (id) {return id === idoc.id})) {
					var options = "Wanted | <a href=/browse/addown/" + idoc.id + ">Own</a> | <a href=/editpolish/" + idoc.id + ">Edit</a>";
			} else {
					var options = "<a href=/browse/addown/" + idoc.id + ">Own</a> | <a href=/browse/addwant/" + idoc.id + ">Want</a> | <a href=/editpolish/" + idoc.id + ">Edit</a>";
			}
			return "<tr><td>"+idoc.name+"</td><td>" + idoc.brand + "</td><td>" + idoc.batch + "</td><td><div id='swatch' style='background-color:" + idoc.colorhex + ";'>&nbsp;</div></td><td>" + idoc.type + "</td><td>" + options + "</td></tr>";
		})

		res.render('browse.ejs', {title: 'Browse - Lacquer Tracker', polishes: newDocs});
	});

});

//own polish
app.get('/browse/addown/:id', isLoggedIn, function(req, res) {
	req.user.wantedpolish.remove(req.params.id);
	req.user.ownedpolish.addToSet(req.params.id);
	req.user.save();
	res.redirect('/browse');
});

//wishlist polish
app.get('/browse/addwant/:id', isLoggedIn, function(req, res) {
	req.user.wantedpolish.addToSet(req.params.id);
	req.user.save();
	res.redirect('/browse');
});


///////////////////////////////////////////////////////////////////////////


//add polish
app.get('/addpolish', /*isLoggedIn,*/ function(req, res) {
	res.render('addpolish.ejs', {title: 'Add a Polish - Lacquer Tracker', message : req.flash('addPolishMessage')});
});

app.post('/addpolish', function(req, res) {
	Polish.findOne({ name : req.body.name, brand : req.body.brand}, function(err, polish) {
		//check to see if there's already a polish name and brand in the database
		if (polish) {
			req.flash('addPolishMessage', 'That polish already exists in the database.')
			res.redirect('/addpolish');
		} else {
			var newPolish = new Polish ({
				name: req.body.name,
				brand: req.body.brand,
				batch: req.body.batch,
				colorcat: req.body.colorcat,
				colorhex: "#" + req.body.colorhex,
				type: req.body.type,
				indie: req.body.indie
			});
			newPolish.save(function(err) {
				req.flash('addPolishMessage', 'Polish has been successfully added. Add another?')
				res.redirect('/addpolish');
			});
		}
	});
});


///////////////////////////////////////////////////////////////////////////


//edit polish
app.get('/editpolish/:id', /*isLoggedIn,*/ function(req, res) {
	Polish.findById(req.params.id, function(err, p) {
	var data = {};
		data.title = 'Edit a Polish - Lacquer Tracker';
		data.message = req.flash('editPolishMessage');
		data.editid = p.id;
		data.editname = p.name;
		data.editbrand = p.brand;
		data.editbatch = p.batch;
		data.editcolorcat = p.colorcat;
		data.editcolorhex = p.colorhex;
		data.edittype = p.type;
		data.editindie = p.indie;
		/*data.editcode = p.code;*/
	res.render('editpolish.ejs', data);
	});
});

app.post('/editpolish/:id', function(req, res) {
	Polish.findById(req.params.id, function(err, p) {
		if (!p) {
			req.flash('editPolishMessage', 'Error editing polish.')
			res.redirect('/editpolish/:id');
		} else {
			p.name = req.body.name;
			p.brand = req.body.brand;
			p.batch = req.body.batch;
			p.colorcat = req.body.colorcat;
			p.colorhex = "#" + req.body.colorhex;
			p.type = req.body.type;
			p.indie = req.body.indie;
			/*p.code = req.body.code;*/
			p.save(function(err) {
				res.redirect('/browse');
			});
		}
	});
});


///////////////////////////////////////////////////////////////////////////


//contact
app.get('/contact', function(req, res) {
	res.render('contact.ejs', {title: 'Contact - Lacquer Tracker'});
});


///////////////////////////////////////////////////////////////////////////


//sign up
app.get('/signup', function(req, res) {
	res.render('signup.ejs', {title: 'Signup - Lacquer Tracker', message: req.flash('signupMessage')});
});

app.post('/signup', passport.authenticate('local-signup', {
	successRedirect: '/settings', //redirect to the secure profile section
	failureRedirect: '/signup', //redirect back to the signup page if there is an error
	failureFlash: true //allow flash messages
}));


///////////////////////////////////////////////////////////////////////////


//log in
app.get('/login', function(req, res) {
	res.render('login.ejs', {title: 'Login - Lacquer Tracker', message: req.flash('loginMessage')});
});

app.post('/login', passport.authenticate('local-login', {
	successRedirect: '/browse',
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


///////////////////////////////////////////////////////////////////////////


//profile
app.get('/profile/:username', function(req, res) {
	User.findOne({username: req.params.username}, function(err, user) {
		var newDocs = [];
		if (!user) {
			req.flash('profilemessage', 'No such user exists.');
		} else {
			user.ownedpolish.map(function(i) {
				Polish.findById(mongoose.Types.ObjectId(i), function(err, idoc) {
					newDocs.push("<tr><td>" + idoc.name + "</td><td>" + idoc.brand + "</td><td>" + idoc.batch + "</td><td><div id='swatch' style='background-color:" + idoc.colorhex + ";'>&nbsp;</div></td><td>" + idoc.type + "</td><td><a href=/editpolish/" + idoc.id + ">Edit</a></td></tr>");
				});
			}); 
		}
		res.render('profile.ejs', {title: 'Profile - Lacquer Tracker', polishes: newDocs, message: req.flash('profilemessage')});
	});
});


///////////////////////////////////////////////////////////////////////////


//settings
app.get('/settings', isLoggedIn, function(req, res) {
	res.render('settings.ejs', {user: req.user, title: 'settings - Lacquer Tracker'});
});



};


///////////////////////////////////////////////////////////////////////////


//route middleware to make sure a user is logged in
function isLoggedIn(req, res, next) {

  //if user is authenticated in the session, carry on
  if (req.isAuthenticated())
	return next();

  //if they aren't, redirect them to the login apge
  res.redirect('/login');
};