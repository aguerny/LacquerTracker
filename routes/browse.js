var Polish = require('../app/models/polish');
var User = require('../app/models/user');
var _ = require('lodash');
var sanitizer = require('sanitizer');
var PolishTypes = require('../app/constants/polishTypes');
var PolishColors = require('../app/constants/polishColors');
var {rgb2lab, lab2rgb, deltaE} = require('rgb-lab');


module.exports = function(app, passport) {


app.get('/browse', function(req, res) {
    Polish.find().distinct('brand', function(error, brands) {
        var allbrands = _.sortBy(brands, function(b) {return b.toLowerCase();});

        data = {};
        data.title = 'Browse - Lacquer Tracker';
        data.meta = 'Search our database of over 10,000 nail polish shades and filter by name, brand, collection, type, color, and more.';
        data.brands = allbrands;
        data.browsekeywords = '';
        data.browsebrand = '';
        data.browsecolorcategory = '';
        data.browseselectcolor = "#008080";
        data.browsetype = '';
        data.recent = true;
        data.types = PolishTypes;

        data.page = 1;

        Polish.find({})
        .sort({dateupdated: -1})
        .limit(10)
        .exec(function (err, polishes) {
            var statuses = [];

            if (req.isAuthenticated()) {

                data.browseowned = sanitizer.sanitize(req.body.owned);
                data.browsewanted = sanitizer.sanitize(req.body.wanted);

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

                res.render('browse.ejs', data);
            } else {
                var returnedpolish = polishes;
                data.polishes = returnedpolish;
                data.status = statuses;
                res.render('browse.ejs', data);
            }
        });
    })
});



app.post('/browse', function(req, res) {

    var page = sanitizer.sanitize(req.body.page);

    var search = {};

    if (req.body.keywords.length > 0) {
        search.keywords = new RegExp(sanitizer.sanitize(req.body.keywords.replace(/[?]/g,"").replace(/[&]/g,"and").replace(/[\\/]/g,"-").replace(/^\s+|\s+$/g,'')), "i");
    }

    if (req.body.brand) {
        search.brand = sanitizer.sanitize(req.body.brand).split(",");
        var databrand = sanitizer.sanitize(req.body.brand).split(",");
    } else {
        var databrand = '';
    }

    if (req.body.type) {
        search.type = {$in: sanitizer.sanitize(req.body.type).split(",")};
        var datatype = sanitizer.sanitize(req.body.type).split(",");
    } else {
        var datatype = '';
    }

    if (!req.body.colorcategory) {
        var datacolor = '';
    } else if (req.body.colorcategory !== "choose") {
        search.colorstodisplay = {$in: sanitizer.sanitize(req.body.colorcategory).split(",")};
        var datacolor = sanitizer.sanitize(req.body.colorcategory).split(",");
    } else {
        function hexToRgb(hex) {
            var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
            return result ? {
                r: parseInt(result[1], 16),
                g: parseInt(result[2], 16),
                b: parseInt(result[3], 16)
            } : null;
        }
        var selectedColorRGB = [hexToRgb(sanitizer.sanitize(req.body.selectcolor)).r, hexToRgb(sanitizer.sanitize(req.body.selectcolor)).g, hexToRgb(sanitizer.sanitize(req.body.selectcolor)).b];

        var deltas = [];
        for (i=0; i<PolishColors.length; i++) {
            deltas.push(deltaE(rgb2lab(PolishColors[i].rgb), rgb2lab(selectedColorRGB)));
        }
        search.colorsname = {$in: PolishColors[deltas.indexOf(Math.min(...deltas))].name};
        var datacolor = 'choose';
    }

    Polish.find().distinct('brand', function(error, brands) {
        var allbrands = _.sortBy(brands, function(b) {return b.toLowerCase();});

        data = {};
        data.title = 'Browse - Lacquer Tracker';
        data.meta = 'Search our database of over 10,000 nail polish shades, searching by name, brand, collection, type, color, and more.';
        data.brands = allbrands;
        data.browsekeywords = sanitizer.sanitize(req.body.keywords);
        data.browsebrand = databrand;
        data.browsecolorcategory = datacolor;
        data.browseselectcolor = sanitizer.sanitize(req.body.selectcolor);
        data.browsetype = datatype;
        data.types = PolishTypes;

        data.recent = false;

        if (typeof req.body.browse !== "undefined") {
            var page = 1;
            data.page = 1;
        } else if (typeof req.body.nextpage !== "undefined") {
            var page = parseInt(sanitizer.sanitize(req.body.page)) + 1;
            data.page = page;
        } else if (typeof req.body.prevpage !== "undefined") {
            var page = parseInt(sanitizer.sanitize(req.body.page)) - 1;
            data.page = page;
        }

        var returnedpolish = [];
        var statuses = [];

        if (req.isAuthenticated()) {

            data.browseowned = sanitizer.sanitize(req.body.owned);
            data.browsewanted = sanitizer.sanitize(req.body.wanted);

            if (req.body.owned === "on" && req.body.wanted === "on") {
                Polish.find(search).sort('brand name').exec(function(err, polishes) {
                    for (i=0; i < polishes.length; i++) {
                        if (req.user.ownedpolish.indexOf(polishes[i].id) > -1) {
                            returnedpolish.push(polishes[i]);
                            statuses.push("owned");
                        } else if (req.user.wantedpolish.indexOf(polishes[i].id) > -1) {
                            returnedpolish.push(polishes[i]);
                            statuses.push("wanted");
                        }
                    }
                    data.page = 0;
                    data.polishes = returnedpolish;
                    data.status = statuses;
                    res.render('browse.ejs', data);
                })
            } else if (req.body.owned === "on") {
                Polish.find(search).sort('brand name').exec(function(err, polishes) {
                    for (i=0; i < polishes.length; i++) {
                        if (req.user.ownedpolish.indexOf(polishes[i].id) > -1) {
                            returnedpolish.push(polishes[i]);
                            statuses.push("owned");
                        }
                    }
                    data.page = 0;
                    data.polishes = returnedpolish;
                    data.status = statuses;
                    res.render('browse.ejs', data);
                })
            } else if (req.body.wanted === "on") {
                Polish.find(search).sort('brand name').exec(function(err, polishes) {
                    for (i=0; i < polishes.length; i++) {
                        if (req.user.wantedpolish.indexOf(polishes[i].id) > -1) {
                            returnedpolish.push(polishes[i]);
                            statuses.push("wanted");
                        }
                    }
                    data.page = 0;
                    data.polishes = returnedpolish;
                    data.status = statuses;
                    res.render('browse.ejs', data);
                })
            } else {
                Polish.find(search).sort('brand name').skip((page-1)*50).limit(50).exec(function(err, polishes) {
                    for (i=0; i < polishes.length; i++) {
                        if (req.user.ownedpolish.indexOf(polishes[i].id) > -1) {
                            statuses.push("owned");
                        } else if (req.user.wantedpolish.indexOf(polishes[i].id) > -1) {
                            statuses.push("wanted");
                        } else {
                            statuses.push("");
                        }
                    }
                    returnedpolish = polishes;
                    data.polishes = returnedpolish;
                    data.status = statuses;
                    res.render('browse.ejs', data);
                })
            }
        } else {
            Polish.find(search).sort('brand name').skip((page-1)*50).limit(50).exec(function(err, polishes) {
                returnedpolish = polishes;
                data.polishes = returnedpolish;
                data.status = statuses;
                res.render('browse.ejs', data);
            })
        }
    })
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