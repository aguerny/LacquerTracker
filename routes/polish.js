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
            data.pdupes = polish.dupes;
            data.linkbrand = polish.brand.replace("%20"," ");
            data.linkname = polish.name.replace("%20"," ");

            Photo.find({polishid : polish.id}, function(err, photo) {
                if (photo.length < 1) {
                    data.allphotos = [{location:'/images/questionmark.png'}];
                    data.numphotos = 0;
                } else {
                    var allphotos = photo.map(function(x) {
                        return x;
                    })
                    data.j = 1;
                    data.allphotos = _.shuffle(allphotos);
                    data.numphotos = photo.length;
                }

                if (req.isAuthenticated()) {

                    if (req.user.ownedpolish.indexOf(polish.id) > -1) {
                        data.status = "owned";
                    } else if (req.user.wantedpolish.indexOf(polish.id) > -1) {
                        data.status = "wanted";
                    } else {
                        data.status = "none";
                    }


                    Review.findOne({user:req.user.id, polishid:polish.id}).populate('user').exec(function (err, review) {
                        if (review) {
                        data.rating = review.rating;
                        data.userreview = review.userreview;
                        data.notes = review.notes;
                        } else {
                        data.rating = "";
                        data.userreview = "";
                        data.notes = "";
                        }

                    Review.find({polishid:polish.id}).populate('user').exec(function(err, r) {
                        data.allreviews = r;
                        res.render('polish.ejs', data);
                    })

                    })
                } else {
                    data.rating = "";
                    data.userreview = "";
                    data.notes = "";
                    data.status = "none";
                    Review.find({polishid:polish.id}).populate('user').exec(function(err, r) {
                        data.allreviews = r;
                        res.render('polish.ejs', data);
                    })
                }
            })
        }
    });
});


//add own polish
app.get('/addown/:id', isLoggedIn, function(req, res) {
    req.user.wantedpolish.remove(req.params.id);
    req.user.ownedpolish.addToSet(req.params.id);
    req.user.save();
    Polish.findById(req.params.id, function(err, p) {
        res.redirect('/polish/' + p.brand.replace(/ /g,"_") + '/' + p.name.replace(/ /g,"_"))
    })
});

//add wishlist polish
app.get('/addwant/:id', isLoggedIn, function(req, res) {
    req.user.wantedpolish.addToSet(req.params.id);
    req.user.save();
    Polish.findById(req.params.id, function(err, p) {
        res.redirect('/polish/' + p.brand.replace(/ /g,"_") + '/' + p.name.replace(/ /g,"_"))
    })
});

//remove owned polish
app.get('/removeown/:id', isLoggedIn, function(req, res) {
    req.user.ownedpolish.remove(req.params.id);
    req.user.save();
    Polish.findById(req.params.id, function(err, p) {
        res.redirect('/polish/' + p.brand.replace(/ /g,"_") + '/' + p.name.replace(/ /g,"_"))
    })
});

//remove wanted polish
app.get('/removewant/:id', isLoggedIn, function(req, res) {
    req.user.wantedpolish.remove(req.params.id);
    req.user.save();
    Polish.findById(req.params.id, function(err, p) {
        res.redirect('/polish/' + p.brand.replace(/ /g,"_") + '/' + p.name.replace(/ /g,"_"))
    })
});

///////////////////////////////////////////////////////////////////////////

//add polish
app.get('/polishadd', isLoggedIn, function(req, res) {
    res.render('polishadd.ejs', {title: 'Add a Polish - Lacquer Tracker', message : req.flash('addPolishMessage')});
});

app.post('/polishadd', isLoggedIn, function(req, res) {
    Polish.findOne({ name : req.body.name, brand : req.body.brand}, function(err, polish) {
        //check to see if there's already a polish name and brand in the database
        if (polish) {
            req.flash('addPolishMessage', 'That polish already exists in the database.')
            res.redirect('/addpolish');
        } else {
            var newPolish = new Polish ({
                name: sanitizer.sanitize((req.body.name).replace(/[?]/g,"")),
                brand: sanitizer.sanitize(req.body.brand),
                batch: sanitizer.sanitize(req.body.batch),
                colorcat: req.body.colorcat,
                colorhex: "#" + sanitizer.sanitize(req.body.colorhex),
                type: req.body.type,
                indie: req.body.indie,
                code: sanitizer.sanitize(req.body.code),
                keywords: sanitizer.sanitize(req.body.name) + " " + sanitizer.sanitize(req.body.brand) + " " + sanitizer.sanitize(req.body.batch) + " " + sanitizer.sanitize(req.body.code),
                dateupdated: new Date(),
                dupes: sanitizer.sanitize(req.body.dupes),
            });
            newPolish.save(function(err) {
                res.redirect('/polish/' + newPolish.brand.replace(/ /g,"_") + "/" + newPolish.name.replace(/ /g,"_"));;
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
                data.editdupes = p.dupes;
            res.render('polishedit.ejs', data);
        }
    });
});

app.post('/polishedit/:id', isLoggedIn, function(req, res) {
    Polish.findById(req.params.id, function(err, p) {
        if (!p) {
            req.flash('editPolishMessage', 'Error editing polish.')
            res.redirect('/polishedit/:id');
        } else {
            p.name = sanitizer.sanitize(req.body.name);
            p.brand = sanitizer.sanitize(req.body.brand);
            p.batch = sanitizer.sanitize(req.body.batch)/*.replace(/[^A-Za-z 0-9!,?-()]/g,'')*/;
            p.colorcat = req.body.colorcat;
            p.colorhex = "#" + sanitizer.sanitize(req.body.colorhex);
            p.type = req.body.type;
            p.indie = req.body.indie;
            p.code = sanitizer.sanitize(req.body.code)/*.replace(/[^A-Za-z 0-9!,?-()]/g,'')*/;
            p.keywords = sanitizer.sanitize(req.body.name) + " " + sanitizer.sanitize(req.body.brand) + " " + sanitizer.sanitize(req.body.batch) + " " + sanitizer.sanitize(req.body.code),
            p.dateupdated = new Date();
            p.dupes = sanitizer.sanitize(req.body.dupes);
            p.save(function(err) {
                res.redirect('/polish/' + p.brand.replace(/ /g,"_") + "/" + p.name.replace(/ /g,"_"));;
            });
        }
    });
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