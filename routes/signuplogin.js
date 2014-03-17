var Polish = require('../app/models/polish');
var User = require('../app/models/user');
var Review = require('../app/models/review');
var Photo = require('../app/models/photo');
var UserPhoto = require('../app/models/userphoto');
var Blog = require('../app/models/blog');
var BlogComment = require('../app/models/blogcomment');
var ForumPost = require('../app/models/forumpost');
var ForumComment = require('../app/models/forumcomment');
var ResetKey = require('../app/models/resetkey');
var mongoose = require('mongoose');
var fs = require('fs');
var path = require('path');
var nodemailer = require('nodemailer');
var sanitizer = require('sanitizer');
var markdown = require('markdown').markdown;
var _ = require('lodash');
var simple_recaptcha = require('simple-recaptcha');
var pagedown = require("pagedown");
var safeConverter = pagedown.getSanitizingConverter();


module.exports = function(app, passport) {


//sign up
app.get('/signup', function(req, res) {
    res.render('signup.ejs', {title: 'Signup - Lacquer Tracker', message: req.flash('signupMessage')});
});

app.post('/signup', passport.authenticate('local-signup', {
    successRedirect: '/profile', //redirect to the secure profile section
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
    res.render('forgotpassword.ejs', {title: 'Retrieve Password - Lacquer Tracker', message:''});
});

app.post('/forgotpassword', function(req, res) {
    User.findOne({username: req.body.username}, function(err, user) {
        if (err) {
            res.render('forgotpassword.ejs', {title: 'Retrieve Password - Lacquer Tracker', message:req.flash('Error.')});
        } else {
            console.log(user);
            if (user) {
                console.log('user exists');
                if (user.email) {
                    var a = new Date();
                    a.setDate(a.getDate()+1);
                    console.log('user email exists');
                    var newResetKey = new ResetKey ({
                        username: req.body.username.toLowerCase(),
                        expiredate: a,
                    })
                    newResetKey.save();

                    var mailOpts, smtpConfig;
                    smtpConfig = nodemailer.createTransport('SMTP', {
                        service: 'Gmail',
                        auth: {
                            user: "lacquertrackermailer@gmail.com",
                            pass: "testpassword123"
                        }
                    });

                    //construct the email sending module
                    mailOpts = {
                        from: 'lacquertrackermailer@gmail.com',
                        to: user.email,
                        //replace it with id you want to send multiple must be separated by ,(comma)
                        subject: 'Password Reset',
                        text: "Your reset password link is: localhost:3000/reset/" + newResetKey.id + "\n\nYou have 24 hours until this key expires.\n\n\nThanks, Lacquer Tracker",
                    };

                    //send Email
                        smtpConfig.sendMail(mailOpts, function (error, response) {

                        //Email not sent
                        if (error) {
                            console.log('email not sent');
                            res.render('forgotpassword.ejs', {title: 'Retrieve Password - Lacquer Tracker', message:req.flash('Error sending e-mail.')});
                        }

                        //email sent successfully
                        else {
                            console.log('email sent');
                            res.render('forgotpassword.ejs', {title: 'Retrieve Password - Lacquer Tracker', message:req.flash('E-mail successfully sent.')});
                        }
                    })
                } else {
                    console.log('user email doesnt exist');
                res.render('forgotpassword.ejs', {title: 'Retrieve Password - Lacquer Tracker', message:req.flash('No e-mail found for this username.')});
                }
            } else {
                console.log('user doesnt exist');
                res.render('forgotpassword.ejs', {title: 'Retrieve Password - Lacquer Tracker', message:req.flash('Username not found.')});
            }
        }
    })
});


app.get('/reset/:key', function(req, res) {
    ResetKey.findById(req.params.key, function(err, resetkey) {
        if (err) {
            res.redirect('/error')
        } else {
            if (new Date(resetkey.expiredate) > new Date()) {
                res.render('passwordreset.ejs', {title: 'Reset Password - Lacquer Tracker', username: resetkey.username})
            } else {
                res.redirect('/error')
            }
        }
    })
});


/*app.post('/reset', function(req, res) {
    if (req.body.password === req.body.confirm) {
        User.findOne({username: req.body.username}, function(err, user) {
            bcrypt.genSalt(10, function(err, salt) {
                bcrypt.hash("B4c0/\/", salt, function(err, hash) {
                    user.password = hash;
                    user.save();
                    res.redirect('/login')
                })
            })
        })
    } else {
        res.render('passwordreset.ejs', {title: 'Reset Password - Lacquer Tracker', username: resetkey.username})
    }
});*/



///////////////////////////////////////////////////////////////////////////


//log out
app.get('/logout', function(req, res) {
    req.logout();
    res.redirect('/');
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