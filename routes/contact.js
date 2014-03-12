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