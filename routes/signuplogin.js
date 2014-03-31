var User = require('../app/models/user');
var ResetKey = require('../app/models/resetkey');
var nodemailer = require('nodemailer');
var sanitizer = require('sanitizer');
var simple_recaptcha = require('simple-recaptcha');
var bcrypt = require("bcrypt-nodejs");


module.exports = function(app, passport) {


//sign up
app.get('/signup', function(req, res) {
    res.render('signup.ejs', {title: 'Signup - Lacquer Tracker', email:'', username:''});
});

app.post('/signup', function(req, res) {
    User.findOne({ 'email' : req.body.email}, function(err, euser) {
        if (err) {
            res.redirect('/error');
        } else if (euser) {
            res.render('signup.ejs', {title: 'Signup - Lacquer Tracker', message: 'That email already has an associated account.', email:'', username:''});
        } else {
            User.findOne({ 'username' : req.body.username.toLowerCase().replace(/[^A-Za-z0-9]/g,"")}, function(err, user) {
                if (err) {
                    res.redirect('/error');
                } else if (user) {
                    res.render('signup.ejs', {title: 'Signup - Lacquer Tracker', message: 'That username is already taken.', email:req.body.email, username:''});
                } else {
                    if (req.body.password === req.body.confirm) {
                        var privateKey = '6Leqre8SAAAAAOKCKdo2WZdYwBcOfjbEOF3v2G99'; // your private key here
                        var ip = req.ip;
                        var challenge = req.body.recaptcha_challenge_field;
                        var response = req.body.recaptcha_response_field;

                        simple_recaptcha(privateKey, ip, challenge, response, function(err) {
                            if (err) {
                                res.render('signup.ejs', {title: 'Signup - Lacquer Tracker', message: 'Captcha wrong. Try again.', email:req.body.email, username:req.body.username});
                            } else {
                                //create the user
                                var newUser = new User();

                                //set the user's local credentials
                                newUser.username = sanitizer.sanitize(req.body.username.toLowerCase().replace(/[^A-Za-z0-9]/g,""));
                                newUser.password = newUser.generateHash(sanitizer.sanitize(req.body.password));
                                newUser.about = "";
                                newUser.email = sanitizer.sanitize(req.body.email);
                                newUser.profilephoto = '/images/blank.png';
                                newUser.isvalidated = false;
                                newUser.level = "normal";
                                newUser.notifications = true;
                                newUser.useremail = true;
                                newUser.creationdate = new Date();

                                //save the user
                                newUser.save(function(err) {
                                    if (err) {
                                        res.render('signup.ejs', {title: 'Signup - Lacquer Tracker', message: 'Error saving account. Please try again.', email:req.body.email, username:req.body.username});
                                    } else {
                                        //send validation e-mail
                                        var mailOpts, smtpConfig;
                                        smtpConfig = nodemailer.createTransport('SMTP', {
                                            service: 'Gmail',
                                            auth: {
                                                user: "lacquertrackermailer@gmail.com",
                                                pass: "testpassword"
                                            }
                                        });

                                        //construct the email sending module
                                        mailOpts = {
                                            from: "Lacquer Tracker",
                                            to: newUser.email,
                                            //replace it with id you want to send multiple must be separated by ,(comma)
                                            subject: 'Welcome to Lacquer Tracker',
                                            text: "Hey " + newUser.username + ",\n\nWelcome to Lacquer Tracker! Please visit the link below to validate your account and get started.\n\nhttp://www.lacquertracker.com/validate/" + newUser.id + "\n\n\nThanks,\nLacquer Tracker",
                                        };

                                        //send Email
                                        smtpConfig.sendMail(mailOpts, function (error, response) {

                                            //Email not sent
                                            if (error) {
                                                res.render('revalidate.ejs', {title: 'Resend Validation E-mail - Lacquer Tracker', message:'Your account was created, but there was an error sending your validation e-mail. Please try again.'});
                                            }

                                            //email sent successfully
                                            else {
                                                res.render('signup.ejs', {title: 'Signup - Lacquer Tracker', message: 'Success! Please check your e-mail to validate your new account.', email:'', username:''});
                                            }
                                        });
                                    }
                                })
                            }
                        })
                    } else {
                        res.render('signup.ejs', {title: 'Signup - Lacquer Tracker', message: 'Passwords do not match.', email:req.body.email, username:req.body.username});
                    }
                }
            })
        }
    })
});



//validate
app.get('/validate/:id', function(req, res) {
    User.findById(req.params.id, function(err, user) {
        if (err || !user) {
            res.redirect('/error');
        } else if (user) {
            user.isvalidated = true;
            user.save(function(err) {
                if (err) {
                    res.redirect('/error');
                } else {
                    req.flash('loginMessage', 'Account validated! Please sign in.');
                    res.render('login.ejs', {title: 'Login - Lacquer Tracker', message: req.flash('loginMessage')});
                }
            })
        }
    })
});


app.get('/revalidate', function(req, res) {
    res.render('revalidate.ejs', {title:'Resend Validation E-mail - Lacquer Tracker'});
});

app.post('/revalidate', function(req, res) {
    User.findOne({username: req.body.username}, function(err, user) {
        if (err) {
            res.render('revalidate.ejs', {title: 'Resend Validation E-mail - Lacquer Tracker', message:'Error. Please try again later.'});
        } else {
            if (user) {
                if (user.isvalidated === true) {
                    res.render('login.ejs', {title: 'Login - Lacquer Tracker', message:'Your account has already been validated. Please log in.'});
                } else {
                    var mailOpts, smtpConfig;
                    smtpConfig = nodemailer.createTransport('SMTP', {
                        service: 'Gmail',
                        auth: {
                            user: "lacquertrackermailer@gmail.com",
                            pass: "testpassword"
                        }
                    });

                    //construct the email sending module
                    mailOpts = {
                        from: "Lacquer Tracker",
                        to: user.email,
                        //replace it with id you want to send multiple must be separated by ,(comma)
                        subject: 'Validation E-mail',
                        text: "Hey " + user.username + ",\n\nLost your welcome e-mail? No worries! Please visit the link below to validate your account and get started.\n\nhttp://www.lacquertracker.com/validate/" + user.id + "\n\n\nThanks,\nLacquer Tracker",
                    };

                    //send Email
                    smtpConfig.sendMail(mailOpts, function (error, response) {

                        //Email not sent
                        if (error) {
                            res.render('revalidate.ejs', {title: 'Resend Validation E-mail - Lacquer Tracker', message:'Error sending e-mail. Please try again later.'});
                        }

                        //email sent successfully
                        else {
                            res.render('revalidate.ejs', {title: 'Resend Validation E-mail - Lacquer Tracker', message:'E-mail successfully sent.'});
                        }
                    })
                }
            } else {
                res.render('revalidate.ejs', {title: 'Resend Validation E-mail - Lacquer Tracker', message:'Username not found.'});
            }
        }
    })
});


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
    res.render('passwordforgot.ejs', {title: 'Retrieve Password - Lacquer Tracker'});
});

app.post('/passwordreset', function(req, res) {
    User.findOne({username: req.body.username}, function(err, user) {
        if (err) {
            res.render('passwordforgot.ejs', {title: 'Retrieve Password - Lacquer Tracker', message:'Unknown error. Please try again later.'});
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
                            pass: "testpassword"
                        }
                    });

                    //construct the email sending module
                    mailOpts = {
                        from: 'lacquertrackermailer@gmail.com',
                        to: user.email,
                        //replace it with id you want to send multiple must be separated by ,(comma)
                        subject: 'Password Reset',
                        text: "Hey " + user.username + ",\n\nYour reset password link is: http://www.lacquertracker.com/reset/" + newResetKey.id + "\n\nYou have 24 hours until this key expires.\n\n\nThanks,\nLacquer Tracker",
                    };

                    //send Email
                        smtpConfig.sendMail(mailOpts, function (error, response) {

                        //Email not sent
                        if (error) {
                            res.render('passwordforgot.ejs', {title: 'Retrieve Password - Lacquer Tracker', message:'Error sending e-mail. Please try again later.'});
                        }

                        //email sent successfully
                        else {
                            res.render('passwordforgot.ejs', {title: 'Retrieve Password - Lacquer Tracker', message:'E-mail successfully sent.'});
                        }
                    })
                } else {
                    res.render('passwordforgot.ejs', {title: 'Retrieve Password - Lacquer Tracker', message:'No e-mail address associated with this username.'});
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
            res.render('passwordforgot.ejs', {title: 'Retrieve Password - Lacquer Tracker', message:'That reset key is expired. Please request a new one.'});
        } else {
            if (new Date(resetkey.expiredate) > new Date()) {
                res.render('passwordreset.ejs', {title: 'Reset Password - Lacquer Tracker', username: resetkey.username})
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