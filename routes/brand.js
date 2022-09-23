var Brand = require('../app/models/brand');
var Polish = require('../app/models/polish');
var User = require('../app/models/user');
var Review = require('../app/models/review');
var Photo = require('../app/models/photo');
var Checkin = require('../app/models/checkin');
var sanitizer = require('sanitizer');
var markdown = require('markdown-css');
var _ = require('lodash');
var PolishColors = require('../app/constants/polishColors');

module.exports = function(app, passport) {


//view a brand
app.get('/brand/:brandname', function(req, res) {

    var thisbrand = sanitizer.sanitize(req.params.brandname.replace(/_/g, " "));

    Brand.findOne({alternatenames: thisbrand.toLowerCase()}, function(err, brand) {
        if (brand === null || brand === undefined) {
            data = {};
            data.title = thisbrand + ' - Lacquer Tracker';
            data.meta = 'Information about the nail polish brand ' + thisbrand + ', including shade names, reviews, photos, swatches, dupes, colors, and types.';
            data.bname = thisbrand;
            data.bbio = '';
            data.bphoto = '';
            data.bofficial = '';
            data.bindie = '';
            data.bid = '';
            data.polishes = [];
            data.status = [];
            data.colors = [];
            res.render('polish/brand.ejs', data);
        } else {
            data = {};
            data.title = brand.name + ' - Lacquer Tracker';
            data.meta = 'Information about the nail polish brand ' + thisbrand + ', including shade names, reviews, photos, swatches, dupes, colors, and types.';
            data.bname = brand.name;
            data.bbio = markdown(brand.bio);
            data.bphoto = brand.photo;
            data.bofficial = brand.official;
            data.bindie = brand.indie;
            data.bid = brand.id;

            Polish.find({brand: thisbrand}).sort('name').exec(function(err, polishes) {
                var statuses = [];
                data.colors = PolishColors;

                if (req.isAuthenticated()) {

                    for (i=0; i < polishes.length; i++) {
                        if (req.user.ownedpolish.indexOf(polishes[i].id) > -1) {
                            statuses.push("owned");
                        } else if (req.user.wantedpolish.indexOf(polishes[i].id) > -1) {
                            statuses.push("wanted");
                        } else {
                            statuses.push("");
                        }
                    }
                    var returnedpolish = polishes;
                    data.polishes = returnedpolish;
                    data.status = statuses;
                    res.render('polish/brand.ejs', data);
                } else {
                    var returnedpolish = polishes;
                    data.polishes = returnedpolish;
                    data.status = statuses;
                    res.render('polish/brand.ejs', data);
                }
            });
        }
    });
});



//delete a brand
app.get('/brand/:brandname/delete', isLoggedIn, function(req, res) {
    if (req.user.level !== "admin") {
        res.redirect('/error')
    } else if (req.user.level === "admin") {
        Brand.findOne({name: req.params.brandname.replace(/_/g, " ")}, function(err, brand) {
             if (brand == null) {
                res.redirect('/error');
             }
            Polish.find({brand: req.params.brandname.replace(/_/g," ")}, function(err, polish) {
                console.log(polish);
                if (polish.length > 0) {
                    res.redirect('/brand/'+req.params.brandname);
                } else {
                    brand.remove();
                    res.redirect('/browse');
                }
            })
        })
    }
});




};



//route middleware to make sure a user is logged in
function isLoggedIn(req, res, next) {

    if (req.isAuthenticated()) {
        User.findById(req.user.id).exec(function(err, user) {
            user.lastlogindate = new Date();
            if (user.ipaddress) {
                if (user.ipaddress.includes(req.header('X-Real-IP') || req.connection.remoteAddress) == false) {
                    user.ipaddress.push(req.header('X-Real-IP') || req.connection.remoteAddress);
                    if (user.ipaddress.length > 5) {
                        user.ipaddress.shift();
                    }
                }
            } else {
                user.ipaddress = [];
                user.ipaddress.push(req.header('X-Real-IP') || req.connection.remoteAddress);
            }
            user.save();
        })
    }

    //if user is authenticated in the session, carry on
    if (req.isAuthenticated())
    return next();

    //if they aren't, redirect them to the login page
    req.session.returnTo = req.path;
    res.redirect('/login');
};