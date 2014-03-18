var mongoose = require('mongoose');
var User = require('../app/models/user');
var ResetKey = require('../app/models/resetkey');
var nodemailer = require('nodemailer');
var sanitizer = require('sanitizer');
var simple_recaptcha = require('simple-recaptcha');
var bcrypt = require("bcrypt-nodejs");


module.exports = function(app, passport) {


//sign up
app.get('/signup', function(req, res) {
    res.render('signup.ejs', {title: 'Signup - Lacquer Tracker', message: req.flash('signupMessage'), email:'', username:''});
});

app.post('/signup', passport.authenticate('local-signup', {
    successReturnToOrRedirect: '/profile',
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
app.get('/passwordreset', function(req, res) {
    res.render('passwordforgot.ejs', {title: 'Retrieve Password - Lacquer Tracker', message:''});
});

app.post('/passwordreset', function(req, res) {
    User.findOne({username: req.body.username}, function(err, user) {
        if (err) {
            res.render('passwordforgot.ejs', {title: 'Retrieve Password - Lacquer Tracker', message:'Error.'});
        } else {
            if (user) {
                if (user.email) {
                    var a = new Date();
                    a.setDate(a.getDate()+1);
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
                            res.render('passwordforgot.ejs', {title: 'Retrieve Password - Lacquer Tracker', message:'Error sending e-mail.'});
                        }

                        //email sent successfully
                        else {
                            res.render('passwordforgot.ejs', {title: 'Retrieve Password - Lacquer Tracker', message:'E-mail successfully sent.'});
                        }
                    })
                } else {
                    res.render('passwordforgot.ejs', {title: 'Retrieve Password - Lacquer Tracker', message:'No e-mail associated with this username.'});
                }
            } else {
                res.render('passwordforgot.ejs', {title: 'Retrieve Password - Lacquer Tracker', message:'Username not found.'});
            }
        }
    })
});


app.get('/reset/:key', function(req, res) {
    ResetKey.findById(req.params.key, function(err, resetkey) {
        if (err) {
            res.render('passwordforgot.ejs', {title: 'Retrieve Password - Lacquer Tracker', message:'That reset key is expired. Please request a new one above.'});
        } else {
            if (new Date(resetkey.expiredate) > new Date()) {
                res.render('passwordreset.ejs', {title: 'Reset Password - Lacquer Tracker', username: resetkey.username, message:''})
            } else {
                res.render('passwordforgot.ejs', {title: 'Retrieve Password - Lacquer Tracker', message:'That reset key is expired. Please request a new one.'});
            }
        }
    })
});


app.post('/reset/:username', function(req, res) {
    if (req.body.password === req.body.confirm) {
        User.findOneAndUpdate({username: req.params.username}, {password: bcrypt.hashSync(req.body.password)}, function(err, user) {
            res.redirect('/login');
        });
    } else {
        res.render('passwordreset.ejs', {title: 'Reset Password - Lacquer Tracker', username: req.params.username, message:'Passwords do not match.'})
    }
});



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