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



module.exports = function(app, passport) {


app.get('/browse', function(req, res) {
    Polish.find().distinct('brand', function(error, brands) {
        var allbrands = brands;

        Polish.find({})
        .sort({dateupdated: -1})
        .limit(10)
        .exec(function (err, polishes) {
            var statuses = [];
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
                res.render('browse.ejs', {title: 'Browse - Lacquer Tracker', polishes: returnedpolish, status: statuses, brands: allbrands});
            } else {
                var returnedpolish = polishes;
                res.render('browse.ejs', {title: 'Browse - Lacquer Tracker', polishes: returnedpolish, status: statuses, brands: allbrands});
            }
        });
    })
});

app.post('/browse', function(req, res) {
    Polish.find().distinct('brand', function(error, brands) {
        var allbrands = brands;

        var filterOptions = _.transform(req.body, function(result, value, key) {
            result[key] = new RegExp(value.replace(/[^A-Za-z 0-9!']/g,''), "i");
        });

        var polishkeys = _.keys(Polish.schema.paths);

        var polishFilter = _.pick(filterOptions, polishkeys);

        Polish.find(polishFilter, function(err, polishes) {

            var returnedpolish = [];
            var statuses = [];

            if (req.isAuthenticated()) {
                if (req.body.owned === "on" && req.body.wanted === "on") {
                    for (i=0; i < polishes.length; i++) {
                        if (req.user.ownedpolish.indexOf(polishes[i].id) > -1) {
                            returnedpolish.push(polishes[i]);
                            statuses.push("owned");
                        } else if (req.user.wantedpolish.indexOf(polishes[i].id) > -1) {
                            returnedpolish.push(polishes[i]);
                            statuses.push("wanted");
                        }
                    }
                    res.render('browse.ejs', {title: 'Browse - Lacquer Tracker', polishes: returnedpolish, status: statuses, brands: allbrands});
                } else if (req.body.owned === "on") {
                    for (i=0; i < polishes.length; i++) {
                        if (req.user.ownedpolish.indexOf(polishes[i].id) > -1) {
                            returnedpolish.push(polishes[i]);
                            statuses.push("owned");
                        }
                    }
                    res.render('browse.ejs', {title: 'Browse - Lacquer Tracker', polishes: returnedpolish, status: statuses, brands: allbrands});
                } else if (req.body.wanted === "on") {
                    for (i=0; i < polishes.length; i++) {
                        if (req.user.wantedpolish.indexOf(polishes[i].id) > -1) {
                            returnedpolish.push(polishes[i]);
                            statuses.push("wanted");
                        }
                    }
                    res.render('browse.ejs', {title: 'Browse - Lacquer Tracker', polishes: returnedpolish, status: statuses, brands: allbrands});
                } else {
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
                    res.render('browse.ejs', {title: 'Browse - Lacquer Tracker', polishes: returnedpolish, status: statuses, brands: allbrands});
                }
            } else {
                returnedpolish = polishes;
                res.render('browse.ejs', {title: 'Browse - Lacquer Tracker', polishes: returnedpolish, status: statuses, brands: allbrands});
            }
        })
    })
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