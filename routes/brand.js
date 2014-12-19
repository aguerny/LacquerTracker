var Brand = require('../app/models/brand');
var Polish = require('../app/models/polish');
var User = require('../app/models/user');
var Review = require('../app/models/review');
var Photo = require('../app/models/photo');
var sanitizer = require('sanitizer');
var markdown = require('markdown-css');
var _ = require('lodash');

module.exports = function(app, passport) {


app.get('/brand/:brandname', function(req, res) {

    Brand.findOne({name: req.params.brandname.replace(/_/g, " ")}, function(err, brand) {
        var thisbrand = req.params.brandname.replace(/_/g, " ");
        if (brand === null) {
            var newBrand = new Brand ({
                name: thisbrand,
                website: '',
                bio: '',
                photo: '',
                official: false,
            })
            newBrand.save(function(err) {
                data = {};
                data.title = thisbrand + ' - Lacquer Tracker';
                data.bname = thisbrand;
                data.bwebsite = '';
                data.bbio = '';
                data.bphoto = '';
                data.bofficial = '';

                Polish.find({brand: thisbrand}).sort('name').exec(function(err, polishes) {
                    var statuses = [];
                    data.colors = ['black','blue','brown','clear','copper','coral','gold','green','grey','multi','nude','orange','pink','purple','red','silver','teal','white','yellow'];

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
                        res.render('brand.ejs', data);
                    } else {
                        var returnedpolish = polishes;
                        data.polishes = returnedpolish;
                        data.status = statuses;
                        res.render('brand.ejs', data);
                    }
                });
            })
        } else {
            data = {};
            data.title = brand.name + ' - Lacquer Tracker';
            data.bname = brand.name;
            data.bwebsite = brand.website;
            data.bbio = markdown(brand.bio);
            data.bphoto = brand.photo;
            data.bofficial = brand.official;

            Polish.find({brand: thisbrand}).sort('name').exec(function(err, polishes) {
                var statuses = [];
                data.colors = ['black','blue','brown','clear','copper','coral','gold','green','grey','multi','nude','orange','pink','purple','red','silver','teal','white','yellow'];

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
                    res.render('brand.ejs', data);
                } else {
                    var returnedpolish = polishes;
                    data.polishes = returnedpolish;
                    data.status = statuses;
                    res.render('brand.ejs', data);
                }
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