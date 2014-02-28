var Polish = require('../app/models/polish');
var User = require('../app/models/user');
var Review = require('../app/models/review');
var Photo = require('../app/models/photo');
var Blog = require('../app/models/blog');
var BlogComment = require('../app/models/blogcomment');
var mongoose = require('mongoose');
var fs = require('fs');
var path = require('path');
var nodemailer = require('nodemailer');


module.exports = function(app, passport) {

///////////////////////////////////////////////////////////////////////////


//home page
app.get('/', function(req, res) {
	res.render('main.ejs', {title: 'Lacquer Tracker'});
});


///////////////////////////////////////////////////////////////////////////


//browse
app.get('/browse', function(req, res) {
	Polish.find().distinct('brand', function(error, brands) {
    	var allbrands = brands;
		
		Polish.find({})
		.limit(10)
		.exec(function (err, docs) {
			var newDocs = docs.map(function(idoc){
				if (req.isAuthenticated() && req.user.ownedpolish.some(function (id) {return id === idoc.id})) {
					var options = "<div id='optionsmenu'>Owned<ul><li><a href=/browse/removeown/" + idoc.id + ">Remove ownership</a></li><li><a href=/polishedit/" + idoc.id + ">Edit polish</a></li></ul></div>";
				} else if (req.isAuthenticated() && req.user.wantedpolish.some(function (id) {return id === idoc.id})) {
					var options = "<div id='optionsmenu'>Wanted<ul><li><a href=/browse/addown/" + idoc.id + ">Add ownership</a></li><li><a href=/browse/removewant/" + idoc.id + ">Remove from wishlist</a></li><li><a href=/polishedit/" + idoc.id + ">Edit polish</a></li></ul></div>";
				} else {
					var options = "<div id='optionsmenu'>&nbsp;<ul><li><a href=/browse/addown/" + idoc.id + ">Add ownership</a></li><li><a href=/browse/addwant/" + idoc.id + ">Add to wishlist</a></li><li><a href=/polishedit/" + idoc.id + ">Edit polish</a></li></ul></div>";
				}
				return "<tr><td><a id='tablelink' href=/polish/" + idoc.brand.replace(/ /g,"_") + "/" + idoc.name.replace(/ /g,"_") + ">" + idoc.name + "</a></td><td>" + idoc.brand + "</td><td>" + idoc.batch + "</td><td><div id='swatch' style='background-color:" + idoc.colorhex + ";'>&nbsp;</div></td><td>" + idoc.type + "</td><td>" + options + "</td></tr>";
			})

		res.render('browse.ejs', {title: 'Browse - Lacquer Tracker', polishes: newDocs, brands: allbrands});
		});
	})
});


app.post('/browse', function(req, res) {
	Polish.find().distinct('brand', function(error, brands) {
    	var allbrands = brands;

		var filterOptions = req.body;
		for(var key in filterOptions) {
			if(filterOptions.hasOwnProperty(key)) {
				filterOptions[key] = new RegExp(filterOptions[key], "i");
				}
			}

		Polish.find(filterOptions , function (err, docs) {
			var polishItems = [];
			var newDocs = docs.map(function(idoc){
				if (req.isAuthenticated() && req.user.ownedpolish.some(function (id) {return id === idoc.id})) {
					var options = "<div id='optionsmenu'>Owned<ul><li><a href=/browse/removeown/" + idoc.id + ">Remove ownership</a></li><li><a href=/polishedit/" + idoc.id + ">Edit polish</a></li></ul></div>";
				} else if (req.isAuthenticated() && req.user.wantedpolish.some(function (id) {return id === idoc.id})) {
					var options = "<div id='optionsmenu'>Wanted<ul><li><a href=/browse/addown/" + idoc.id + ">Add ownership</a></li><li><a href=/browse/removewant/" + idoc.id + ">Remove from wishlist</a></li><li><a href=/polishedit/" + idoc.id + ">Edit polish</a></li></ul></div>";
				} else {
					var options = "<div id='optionsmenu'>&nbsp;<ul><li><a href=/browse/addown/" + idoc.id + ">Add ownership</a></li><li><a href=/browse/addwant/" + idoc.id + ">Add to wishlist</a></li><li><a href=/polishedit/" + idoc.id + ">Edit polish</a></li></ul></div>";
				}
				return "<tr><td><a id='tablelink' href=/polish/" + idoc.brand.replace(/ /g,"_") + "/" + idoc.name.replace(/ /g,"_") + ">" + idoc.name + "</a></td><td>" + idoc.brand + "</td><td>" + idoc.batch + "</td><td><div id='swatch' style='background-color:" + idoc.colorhex + ";'>&nbsp;</div></td><td>" + idoc.type + "</td><td>" + options + "</td></tr>";
			})

			res.render('browse.ejs', {title: 'Browse - Lacquer Tracker', polishes: newDocs, brands: allbrands});
		});
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

//remove owned polish
app.get('/browse/removeown/:id', isLoggedIn, function(req, res) {
	req.user.ownedpolish.remove(req.params.id);
	req.user.save();
	res.redirect('/browse');
});

//remove wanted polish
app.get('/browse/removewant/:id', isLoggedIn, function(req, res) {
	req.user.wantedpolish.remove(req.params.id);
	req.user.save();
	res.redirect('/browse');
});

///////////////////////////////////////////////////////////////////////////

//polish page specific
app.get('/polish/:brand/:name', function(req, res) {

	Polish.findOne({brand: req.params.brand.replace(/_/g," "), name:req.params.name.replace(/_/g," ")}, function(err, polish) {
		if (polish === null) {
			res.redirect('/error');
		} else {
			data = {};
			data.title = polish.name + ' - ' + polish.brand + ' - Lacquer Tracker'
			data.pname = polish.name;
			data.pbrand = polish.brand;
			data.pbatch = polish.batch;
			data.pcolorcat = polish.colorcat;
			data.pcolorhex = polish.colorhex;
			data.ptype = polish.type;
			data.pcode = polish.code;
			data.pid = polish.id;
			data.linkbrand = polish.brand.replace("%20"," ");
			data.linkname = polish.name.replace("%20"," ");

			Photo.find({polishid : polish.id}, function(err, photo) {
				if (photo.length < 1) {
					data.allphotos = ['/images/questionmark.png'];
					data.numphotos = "0";
				} else {
					var allphotos = photo.map(function(x) {
						console.log(x.location);
						return x.location;
					})
					data.allphotos = allphotos;
					data.numphotos = photo.length;
				}

				if (req.isAuthenticated()) {
					Review.findOne({userid:req.user.id, polishid:polish.id}, function (err, review) {
						if (review) {
						data.rating = review.rating;
						data.userreview = review.userreview;
						data.notes = review.notes;
						data.dupes = review.dupes;
						} else {
						data.rating = "";
						data.userreview = "";
						data.notes = "";
						data.dupes = "";
						}

					Review.find({polishid:polish.id}, function(err, r) {
						var allReviews = r.map(function(x) {
							return x.userreview;
						})
						var allReviewsUser = r.map(function(x) {
							return x.username;
						})
						var allDupes = r.map(function(x) {
							return x.dupes;
						})
						data.allreviews = allReviews;
						data.allreviewsusername = allReviewsUser;
						data.alldupes = allDupes;
						res.render('polish.ejs', data);
					})

					})
				} else {
					data.rating = "";
					data.userreview = "";
					data.notes = "";
					data.dupes = "";
					Review.find({polishid:polish.id}, function(err, r) {
						var allReviews = r.map(function(x) {
							return x.userreview;
						})
						var allReviewsUser = r.map(function(x) {
							return x.username;
						})
						var allDupes = r.map(function(x) {
							return x.dupes;
						})
						data.allreviews = allReviews;
						data.allreviewsusername = allReviewsUser;
						data.alldupes = allDupes;
						res.render('polish.ejs', data);
					})
				}
			})
		}
	});

});



///////////////////////////////////////////////////////////////////////////


//add photo
app.get('/photo/add/:id', isLoggedIn, function(req, res) {
	Polish.findById(req.params.id, function(err, p) {
		if (p === null) {
			res.redirect('/error');
		} else {
			var data = {};
				data.title = 'Add a Photo - Lacquer Tracker';
				data.pname = p.name;
				data.pbrand = p.brand;
				data.pid = p.id;
			res.render('photoadd.ejs', data);
		}
	})
});

app.post('/photo/add/:id', function(req, res) {
	var tempPath = req.files.photo.path;
	var targetPath = path.resolve('./public/images/polish/' + req.params.id + "-" + req.files.photo.name.replace(/ /g,"_"));
	fs.rename(tempPath, targetPath, function(err) {
		if (err) {
			throw err;
		} else {
			fs.unlink(tempPath, function() {
				if (err) throw err;
			})
			Polish.findById(req.params.id, function(err, p) {
				var newPhoto = new Photo ({
					polishid: p.id,
					userid: req.user.id,
					type: req.body.type,
					location: '/images/polish/' + p.id + "-" + req.files.photo.name.replace(/ /g,"_"),
				})
				newPhoto.save(function(err) {
					res.redirect('/polish/' + p.brand.replace(/ /g,"_") + "/" + p.name.replace(/ /g,"_"));
				})
			})
		}
	})
});



///////////////////////////////////////////////////////////////////////////


//edit review
app.get('/review/edit/:id', isLoggedIn, function(req, res) {
	var data = {};
	data.title = 'Edit Your Review - Lacquer Tracker';
	data.polishid = req.params.id;

	Polish.findById(req.params.id, function(err, polish) {
		data.polishname = polish.name;
		data.polishbrand = polish.brand;

		Review.findOne({polishid: req.params.id, userid:req.user.id}, function(err, review) {
			if (review) { //if review already exists
				data.userid = review.userid;
				data.username = review.username;
				data.rating = review.rating;
				data.userreview = review.userreview;
				data.dupes = review.dupes;
				data.notes = review.notes;
				res.render('reviewedit.ejs', data);
			} else { //the review doesn't exist yet.
				data.userid = req.user.id;
				data.username = req.user.username;
				data.rating = "";
				data.userreview = "";
				data.dupes = "";
				data.notes = "";
				res.render('reviewedit.ejs', data);
			}
		})
	})
});


app.post('/review/edit/:id', function(req, res) {
	Polish.findById(req.params.id, function(err, polish) {
		var polishname = polish.name;
		var polishbrand = polish.brand;
		
		Review.findOne({polishid: req.params.id, userid:req.user.id}, function(err, review) {
			if (review) { //if review already exists
				review.rating = req.body.rating;
				review.userreview = req.body.userreview;
				review.dupes = req.body.dupes;
				review.notes = req.body.notes;
				review.save(function(err) {
					res.redirect('/polish/' + polishbrand.replace(/ /g,"_") + "/" + polishname.replace(/ /g,"_"));
				});
			} else {
				var newReview = new Review ({
					polishid: req.params.id,
					userid: req.user.id,
					username: req.user.username,
					rating: req.body.rating,
					userreview: req.body.userreview,
					dupes: req.body.dupes,
					notes: req.body.notes,
				});
				newReview.save(function(err) {
					res.redirect('/polish/' + polishbrand.replace(/ /g,"_") + "/" + polishname.replace(/ /g,"_"));
				});
			}
		})
	})
});




///////////////////////////////////////////////////////////////////////////


//add polish
app.get('/polishadd', isLoggedIn, function(req, res) {
	res.render('polishadd.ejs', {title: 'Add a Polish - Lacquer Tracker', message : req.flash('addPolishMessage')});
});

app.post('/polishadd', function(req, res) {
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
				indie: req.body.indie,
				code: req.body.code,
				keywords: req.body.name + " " + req.body.brand + " " + req.body.batch + " " + req.body.code,
			});
			newPolish.save(function(err) {
				req.flash('addPolishMessage', 'Polish has been successfully added. Add another?')
				res.redirect('/polishadd');
			});
		}
	});
});


///////////////////////////////////////////////////////////////////////////


//edit polish
app.get('/polishedit/:id', isLoggedIn, function(req, res) {
	Polish.findById(req.params.id, function(err, p) {
		if (p === null || err) {
			res.redirect('/error');
		} else {
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
				data.editcode = p.code;
			res.render('polishedit.ejs', data);
		}
	});
});

app.post('/polishedit/:id', function(req, res) {
	Polish.findById(req.params.id, function(err, p) {
		if (!p) {
			req.flash('editPolishMessage', 'Error editing polish.')
			res.redirect('/polishedit/:id');
		} else {
			p.name = req.body.name;
			p.brand = req.body.brand;
			p.batch = req.body.batch;
			p.colorcat = req.body.colorcat;
			p.colorhex = "#" + req.body.colorhex;
			p.type = req.body.type;
			p.indie = req.body.indie;
			p.code = req.body.code;
			p.keywords = req.body.name + " " + req.body.brand + " " + req.body.batch + " " + req.body.code,
			p.save(function(err) {
				res.redirect('/polish/' + p.brand.replace(/ /g,"_") + "/" + p.name.replace(/ /g,"_"));;
			});
		}
	});
});


///////////////////////////////////////////////////////////////////////////


//contact
app.get('/contact', function(req, res) {
	res.render('contact.ejs', {title: 'Contact - Lacquer Tracker', message:req.flash('contactmessage')});
});

app.post('/contact', function (req, res) {
	var mailOpts, smtpConfig;
	smtpConfig = nodemailer.createTransport('SMTP', {
		service: 'Gmail',
		auth: {
			user: "lacquertrackermailer@gmail.com",
			pass: "testpassword567"
		}
	});

	//construct the email sending module
	mailOpts = {
		from: req.body.name + ' &lt;' + req.body.email + '&gt;',
		to: 'lacquertrackermailer@gmail.com',
		//replace it with id you want to send multiple must be separated by ,(comma)
		subject: 'Contact Form Submission',
		text: "From:" + req.body.name + '@' + req.body.email + "Message:" + req.body.message
	};
	
	//send Email
		smtpConfig.sendMail(mailOpts, function (error, response) {

	//Email not sent
	if (error) {
		req.flash('contactMessage', 'Could not send feedback.');
		res.render('contact.ejs', {title: 'Contact - Lacquer Tracker', message:req.flash('contactMessage')});
	}
	
	//email sent successfully
	else {
		req.flash('contactMessage', 'Feedback successfully sent!');
		res.render('contact.ejs', {title: 'Contact - Lacquer Tracker', message:req.flash('contactMessage')});
	}
	});
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


///////////////////////////////////////////////////////////////////////////

//profile general
app.get('/profile', isLoggedIn, function(req, res) {
	var username = req.user.username;
	res.redirect('/profile/' + username);
});


//profile specific
app.get('/profile/:username', function(req, res) {
	User.findOne({username: req.params.username}, function(err, user) {
		var oPolish = [];
		var wPolish = [];
		if (!user) {
			req.flash('profilemessage', 'No such user exists.');
			res.render('profile.ejs', {title: 'Profile - Lacquer Tracker', opolishes: oPolish, wpolishes: wPolish, message: req.flash('profilemessage'), about: ""});
		} else {
			var ownedPolish = user.ownedpolish.map(function(id) {
				return mongoose.Types.ObjectId(id);
			});

			var wantedPolish = user.wantedpolish.map(function(id) {
				return mongoose.Types.ObjectId(id);
			});

			Polish.find({_id: {$in: ownedPolish}}, function(err, docs){
				for(var docIndex = 0; docIndex < docs.length; docIndex++) {
					if (req.isAuthenticated() && req.user.ownedpolish.some(function (id) {return id === docs[docIndex].id})) {
						var options = "<div id='optionsmenu'>Owned<ul><li><a href=/browse/removeown/" + docs[docIndex].id + ">Remove ownership</a></li><li><a href=/polishedit/" + docs[docIndex].id + ">Edit polish</a></li></ul></div>";
					} else if (req.isAuthenticated() && req.user.wantedpolish.some(function (id) {return id === docs[docIndex].id})) {
						var options = "<div id='optionsmenu'>Wanted<ul><li><a href=/browse/addown/" + docs[docIndex].id + ">Add ownership</a></li><li><a href=/browse/removewant/" + docs[docIndex].id + ">Remove from wishlist</a></li><li><a href=/polishedit/" + docs[docIndex].id + ">Edit polish</a></li></ul></div>";
					} else {
						var options = "<div id='optionsmenu'>&nbsp;<ul><li><a href=/browse/addown/" + docs[docIndex].id + ">Add ownership</a></li><li><a href=/browse/addwant/" + docs[docIndex].id + ">Add to wishlist</a></li><li><a href=/polishedit/" + docs[docIndex].id + ">Edit polish</a></li></ul></div>";
					}
			 		oPolish.push("<tr><td><a id='tablelink' href=/polish/" + docs[docIndex].brand.replace(/ /g," ") + "/" + docs[docIndex].name.replace(/ /g,"_") + ">" + docs[docIndex].name + "</a></td><td>" + docs[docIndex].brand + "</td><td>" + docs[docIndex].batch + "</td><td>" + docs[docIndex].colorcat + "</td><td><div id='swatch' style='background-color:" + docs[docIndex].colorhex + ";'>&nbsp;</div></td><td>" + docs[docIndex].type + "</td><td>" + options + "</td></tr>");
				}
			

			Polish.find({_id: {$in: wantedPolish}}, function(err, docs){
				for(var docIndex = 0; docIndex < docs.length; docIndex++) {
					if (req.isAuthenticated() && req.user.ownedpolish.some(function (id) {return id === docs[docIndex].id})) {
						var options = "<div id='optionsmenu'>Owned<ul><li><a href=/browse/removeown/" + docs[docIndex].id + ">Remove own</a></li><li><a href=/polishedit/" + docs[docIndex].id + ">Edit polish</a></li></ul></div>";
					} else if (req.isAuthenticated() && req.user.wantedpolish.some(function (id) {return id === docs[docIndex].id})) {
						var options = "<div id='optionsmenu'>Wanted<ul><li><a href=/browse/addown/" + docs[docIndex].id + ">Add own</a></li><li><a href=/browse/removewant/" + docs[docIndex].id + ">Remove want</a></li><li><a href=/polishedit/" + docs[docIndex].id + ">Edit polish</a></li></ul></div>";
					} else {
						var options = "<div id='optionsmenu'>&nbsp;<ul><li><a href=/browse/addown/" + docs[docIndex].id + ">Add own</a></li><li><a href=/browse/addwant/" + docs[docIndex].id + ">Add want</a></li><li><a href=/polishedit/" + docs[docIndex].id + ">Edit polish</a></li></ul></div>";
					}
			 		wPolish.push("<tr><td><a id='tablelink' href=/polish/" + docs[docIndex].brand.replace(/ /g," ") + "/" + docs[docIndex].name.replace(/ /g,"_") + ">" + docs[docIndex].name + "</a></td><td>" + docs[docIndex].brand + "</td><td>" + docs[docIndex].batch + "</td><td>" + docs[docIndex].colorcat + "</td><td><div id='swatch' style='background-color:" + docs[docIndex].colorhex + ";'>&nbsp;</div></td><td>" + docs[docIndex].type + "</td><td>" + options + "</td></tr>");
				}

			var data = {};
			data.title = 'Profile - Lacquer Tracker';
			data.message = req.flash('profileMessage');
			data.opolishes = oPolish;
			data.wpolishes = wPolish;
			data.username = user.username;
			data.about = user.about;

			res.render('profile.ejs', data);

			});
			});
		}
	});
});


///////////////////////////////////////////////////////////////////////////


//edit profile
app.get('/profile/edit', isLoggedIn, function(req, res) {
	var usernamee = req.user.username;
	res.redirect('/profile/edit/' + usernamee);
});


app.get('/profile/:username/edit', isLoggedIn, function(req, res) {
	if (req.params.username === req.user.username) {
		User.findOne({username : req.params.username}, function(err, user) {
		var data = {};
			data.title = 'Edit Your Profile - Lacquer Tracker';
			data.message = req.flash('editProfileMessage');
			data.userid = user.id;
			data.username = user.username;
			data.email = user.email;
			data.about = user.about;
		res.render('profileedit.ejs', data);
		})
	} else {
		res.redirect('/error');
	}
});

app.post('/profile/:username/edit', function(req, res) {
	User.findOne({username:req.params.username}, function(err, user) {
		if (!user) {
			req.flash('editProfileMessage', 'Error editing profile.')
			res.redirect('/polishedit/:username');
		} else {
			user.email = req.body.email;
			user.about = req.body.about;
			user.save(function(err) {
				res.redirect('/profile/' + req.user.username);
			});
		}
	});
});


///////////////////////////////////////////////////////////////////////////


//main blog page
app.get('/blog', function(req, res) {
	data = {}
	data.title = 'Blog - Lacquer Tracker';
	var blogposts = [];
	Blog.find({}).sort({datefull: -1}).exec(function(err, posts) {
		var allposts = posts.map(function(post) {
			blogposts.push(post);
		})
		data.blogposts = blogposts;
		res.render('blog.ejs', data);
	})
});



app.get('/blog/add', isLoggedIn, function(req, res) {
	if (req.user.username === "t" || req.user.username === "alli") {
		res.render('blogadd.ejs', {title: 'Add a Blog Entry - Lacquer Tracker'});
	} else {
		res.redirect('/error');
	}
});


app.post('/blog/add', function(req, res) {
	var m_names = new Array("Jan", "Feb", "Mar", "Apr", "May", "June", "July", "Aug", "Sep", "Oct", "Nov", "Dec");
	var d_names = new Array("Sun", "Mon", "Tues", "Wed", "Thurs", "Fri", "Sat");
	var d = new Date();
	var curr_date = d.getDate();
	var curr_month = d.getMonth();
	var curr_year = d.getFullYear();
	var curr_day = d.getDay();
	var curr_hour = d.getHours();
	var curr_min = d.getMinutes();
	if (curr_min < 10) {curr_min = "0" + curr_min;}
	var suffix = "am";
	if (curr_hour >= 12) {suffix = "pm"; curr_hour = curr_hour - 12;}
	if (curr_hour == 0) {curr_hour = 12;}
	var dateformatted = d_names[curr_day] + ", " + m_names[curr_month] + " " + curr_date + " " + curr_year + ", " + curr_hour + ":" + curr_min + " " + suffix;

	var newBlog = new Blog ({
		userid: req.user.id,
		username: req.user.username,
		title: req.body.posttitle,
		message: req.body.postmessage,
		datefull: new Date(),
		date: dateformatted,
	});
	newBlog.save(function(err) {
		if (err) throw err;
		else res.redirect('/blog');
	})
});



//Specific Blog Page
app.get('/blog/:title', function(req, res) {
	data = {};
	Blog.findOne({title: req.params.title.replace(/_/g," ")}, function (err, blog) {
		if (blog === null) {
			res.redirect('/error');
		} else {
			data.title = blog.title + " - Lacquer Tracker";
			data.posttitle = blog.title;
			data.postuserid = blog.userid;
			data.postusername = blog.username;
			data.postmessage = blog.message;
			data.postdate = blog.date;
			BlogComment.find({parentid:blog.id}, function(err, c) {
				data.postcomments = c;
				res.render('blogview.ejs', data);
			})
		}
	})
});



app.get('/blog/:title/add', isLoggedIn, function(req, res) {
	res.redirect('/blog/' + req.params.title.replace(/_/g," ") + "#addcomment")
});



app.post('/blog/:title/add', isLoggedIn, function(req, res) {
	var thistitle = req.params.title.replace(/_/g," ")
	Blog.findOne({title: thistitle}, function (err, blog){
		var m_names = new Array("Jan", "Feb", "Mar", "Apr", "May", "June", "July", "Aug", "Sep", "Oct", "Nov", "Dec");
		var d_names = new Array("Sun", "Mon", "Tues", "Wed", "Thurs", "Fri", "Sat");
		var d = new Date();
		var curr_date = d.getDate();
		var curr_month = d.getMonth();
		var curr_year = d.getFullYear();
		var curr_day = d.getDay();
		var curr_hour = d.getHours();
		var curr_min = d.getMinutes();
		if (curr_min < 10) {curr_min = "0" + curr_min;}
		var suffix = "am";
		if (curr_hour >= 12) {suffix = "pm"; curr_hour = curr_hour - 12;}
		if (curr_hour == 0) {curr_hour = 12;}
		var dateformatted = d_names[curr_day] + ", " + m_names[curr_month] + " " + curr_date + " " + curr_year + ", " + curr_hour + ":" + curr_min + " " + suffix;

		var newBlogComment = new BlogComment ({
			parentid: blog.id,
			userid: req.user.id,
			username: req.user.username,
			message: req.body.message,
			datefull: new Date(),
			date: dateformatted,
		})
		newBlogComment.save(function(err) {
			res.redirect('/blog/' + blog.title)
		})
	})
});


app.get('/blog/:title/:id/remove', isLoggedIn, function(req, res) {
	BlogComment.findByIdAndRemove(req.params.id, function(err) {
		res.redirect("/blog/" + req.params.title);
	})
});


///////////////////////////////////////////////////////////////////////////

app.get('/error', function(req, res) {
	res.render('error.ejs', {title: 'Oops! - Lacquer Tracker'});
});

//.replace(/ /g,"_")

///////////////////////////////////////////////////////////////////////////


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