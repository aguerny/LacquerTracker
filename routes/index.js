var Polish = require('../app/models/polish');
var User = require('../app/models/user');
var Review = require('../app/models/review');
var Photo = require('../app/models/photo');
var UserPhoto = require('../app/models/userphoto');
var ForumPost = require('../app/models/forumpost');
var ForumComment = require('../app/models/forumcomment');
var mongoose = require('mongoose');
var fs = require('fs');
var path = require('path');
var nodemailer = require('nodemailer');
var sanitizer = require('sanitizer');
var markdown = require('markdown-css');
var _ = require('lodash');
var request = require('request');



module.exports = function(app, passport) {fs.readdirSync('./routes').forEach(function (file) {


    // Avoid to read this current file.
    if (file === path.basename(__filename)) { return; }

    // Load the route file.
    require('./' + file)(app, passport);
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