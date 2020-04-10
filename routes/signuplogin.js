var User = require('../app/models/user');
var ResetKey = require('../app/models/resetkey');
var nodemailer = require('nodemailer');
var sanitizer = require('sanitizer');
var request = require('request');
var bcrypt = require("bcrypt-nodejs");


module.exports = function(app, passport) {


//sign up
app.get('/signup', function(req, res) {
    res.render('account/signup.ejs', {title: 'Signup - Lacquer Tracker', email:'', username:''});
});

app.post('/signup', function(req, res) {
    User.findOne({ 'email' : sanitizer.sanitize(req.body.email)}, function(err, euser) {
        if (err) {
            res.redirect('/error');
        } else if (euser) {
            res.render('account/signup.ejs', {title: 'Signup - Lacquer Tracker', message: 'That email already has an associated account.', email:'', username:''});
        } else {
            User.findOne({ 'username' : sanitizer.sanitize(req.body.username.toLowerCase().replace(/[^A-Za-z0-9]/g,""))}, function(err, user) {
                if (err) {
                    res.redirect('/error');
                } else if (user) {
                    res.render('account/signup.ejs', {title: 'Signup - Lacquer Tracker', message: 'That username is already taken.', email:sanitizer.sanitize(req.body.email), username:''});
                } else if (req.body.username.length > 20) {
                    res.render('account/signup.ejs', {title: 'Signup - Lacquer Tracker', message: 'Username max length is 15 characters.', email:sanitizer.sanitize(req.body.email), username:''});
                } else {
                    if (sanitizer.sanitize(req.body.password) === sanitizer.sanitize(req.body.confirm)) {

                        if (req.body['g-recaptcha-response'] === undefined || req.body['g-recaptcha-response'] === '' || req.body['g-recaptcha-response'] === null) {
                            res.render('account/signup.ejs', {title: 'Signup - Lacquer Tracker', message: 'Captcha wrong. Try again.', email:sanitizer.sanitize(req.body.email), username:sanitizer.sanitize(req.body.username)});
                        }
                        // Put your secret key here.
                        var secretKey = process.env.LTRECAPTCHASECRETKEY;
                        // req.connection.remoteAddress will provide IP address of connected user.
                        var verificationUrl = "https://www.google.com/recaptcha/api/siteverify?secret=" + secretKey + "&response=" + req.body['g-recaptcha-response'] + "&remoteip=" + req.connection.remoteAddress;
                        // Hitting GET request to the URL, Google will respond with success or error scenario.
                        request(verificationUrl,function(error,response,body) {
                            body = JSON.parse(body);
                            // Success will be true or false depending upon captcha validation.
                            if(body.success !== undefined && !body.success) {
                                res.render('account/signup.ejs', {title: 'Signup - Lacquer Tracker', message: 'Captcha wrong. Try again.', email:sanitizer.sanitize(req.body.email), username:sanitizer.sanitize(req.body.username)});
                            }
                            if (body.success === true) {
                                //create the user
                                var newUser = new User();

                                //set the user's local credentials
                                newUser.username = sanitizer.sanitize(req.body.username.toLowerCase().replace(/[^A-Za-z0-9]/g,""));
                                newUser.password = newUser.generateHash(sanitizer.sanitize(req.body.password));
                                newUser.about = "";
                                newUser.email = sanitizer.sanitize(req.body.email);
                                newUser.profilephoto = '';
                                newUser.isvalidated = false;
                                newUser.level = "normal";
                                newUser.notifications = "on";
                                newUser.useremail = "on";
                                newUser.creationdate = new Date();
                                newUser.lastlogindate = new Date();
                                newUser.country = "";
                                newUser.timezone = "America/New_York";
                                newUser.deleted = false;

                                //save the user
                                newUser.save(function(err) {
                                    if (err) {
                                        res.render('account/signup.ejs', {title: 'Signup - Lacquer Tracker', message: 'Error saving account. Please try again.', email:sanitizer.sanitize(req.body.email), username:sanitizer.sanitize(req.body.username)});
                                    } else {
                                        //send validation e-mail
                                        var transport = nodemailer.createTransport({
                                            sendmail: true,
                                            path: "/usr/sbin/sendmail"
                                        });

                                        var mailOptions = {
                                            from: "polishrobot@lacquertracker.com",
                                            to: newUser.email,
                                            subject: 'Welcome to Lacquer Tracker',
                                            text: "Hey " + newUser.username + ",\n\nWelcome to Lacquer Tracker! Please visit the link below to validate your account and get started.\n\nhttps://www.lacquertracker.com/validate/" + newUser.id + "\n\n\nThanks,\nLacquer Tracker",
                                        }

                                        transport.sendMail(mailOptions, function(error, response) {
                                            if (error) {
                                                res.render('account/revalidate.ejs', {title: 'Resend Validation E-mail - Lacquer Tracker', message:'Your account was created, but there was an error sending your validation e-mail. Please try again.'});
                                            }
                                            else {
                                                res.render('account/successmessage.ejs', {title: 'Signup - Lacquer Tracker', message: "Success! Please check your e-mail to validate your new account. (It might be in your spam folder.)"});
                                            }

                                            transport.close();
                                        });
                                    }
                                })
                            } else {
                                res.render('account/revalidate.ejs', {title: 'Resend Validation E-mail - Lacquer Tracker', message:'Your account was created, but there was an error sending your validation e-mail. Please try again.'});
                            }
                        });
                    } else {
                        res.render('account/signup.ejs', {title: 'Signup - Lacquer Tracker', message: 'Passwords do not match. Try again.', email:sanitizer.sanitize(req.body.email), username:sanitizer.sanitize(req.body.username)});
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
                    res.render('account/login.ejs', {title: 'Login - Lacquer Tracker', message: req.flash('loginMessage')});
                }
            })
        }
    })
});


app.get('/revalidate', function(req, res) {
    res.render('account/revalidate.ejs', {title:'Resend Validation E-mail - Lacquer Tracker'});
});

app.post('/revalidate', function(req, res) {
    User.findOne({username: sanitizer.sanitize(req.body.username)}, function(err, user) {
        if (err) {
            res.render('account/revalidate.ejs', {title: 'Resend Validation E-mail - Lacquer Tracker', message:'Error. Please try again later.'});
        } else {
            if (user) {
                if (user.isvalidated === true) {
                    res.render('account/login.ejs', {title: 'Login - Lacquer Tracker', message:'This account has already been validated or does not exist.'});
                } else {
                    var transport = nodemailer.createTransport({
                        sendmail: true,
                        path: "/usr/sbin/sendmail"
                    });

                    var mailOptions = {
                        from: "polishrobot@lacquertracker.com",
                        to: user.email,
                        subject: 'Validation E-mail',
                        text: "Hey " + user.username + ",\n\nLost your welcome e-mail? No worries! Please visit the link below to validate your account and get started.\n\nhttps://www.lacquertracker.com/validate/" + user.id + "\n\n\nThanks,\nLacquer Tracker",
                    }

                    transport.sendMail(mailOptions, function(error, response) {
                        if (error) {
                            res.render('account/revalidate.ejs', {title: 'Resend Validation E-mail - Lacquer Tracker', message:'Error sending e-mail. Please try again later.'});
                        }
                        else {
                            res.render('account/successmessage.ejs', {title: 'Resend Validation E-mail - Lacquer Tracker', message:'Validation e-mail successfully re-sent. (It might be in your spam folder.)'});
                        }

                        transport.close();
                    });
                }
            } else {
                res.render('account/revalidate.ejs', {title: 'Resend Validation E-mail - Lacquer Tracker', message:'This account has already been validated or does not exist.'});
            }
        }
    })
});


///////////////////////////////////////////////////////////////////////////


//log in
app.get('/login', function(req, res) {
    res.render('account/login.ejs', {title: 'Login - Lacquer Tracker', message: req.flash('loginMessage')});
});

app.post('/login', passport.authenticate('local-login', {
    successReturnToOrRedirect: '/profile',
    failureRedirect: '/login',
    failureFlash: true
}));



///////////////////////////////////////////////////////////////////////////


//forgot password
app.get('/passwordreset', function(req, res) {
    res.render('account/passwordforgot.ejs', {title: 'Retrieve Password - Lacquer Tracker'});
});

app.post('/passwordreset', function(req, res) {
    User.findOne({username: sanitizer.sanitize(req.body.username)}, function(err, user) {
        if (err) {
            res.render('account/passwordforgot.ejs', {title: 'Retrieve Password - Lacquer Tracker', message:'Error. Please try again later.'});
        } else {
            if (user) {
                if (user.email) {
                    var a = new Date();
                    a.setDate(a.getDate()+1);
                    var newResetKey = new ResetKey ({
                        username: user.username,
                        expiredate: a,
                    })
                    newResetKey.save();

                    //send email
                    var transport = nodemailer.createTransport({
                        sendmail: true,
                        path: "/usr/sbin/sendmail"
                    });

                    var mailOptions = {
                        from: "polishrobot@lacquertracker.com",
                        to: user.email,
                        subject: 'Password Reset',
                        text: "Hey " + user.username + ",\n\nYour reset password link is: https://www.lacquertracker.com/reset/" + newResetKey.id + "\n\nYou have 24 hours until this key expires.\n\n\nThanks,\nLacquer Tracker",
                    }

                    transport.sendMail(mailOptions, function(error, response) {
                        if (error) {
                            res.render('account/passwordforgot.ejs', {title: 'Retrieve Password - Lacquer Tracker', message:'Error. Please try again later.'});
                        }
                        else {
                            res.render('account/successmessage.ejs', {title: 'Retrieve Password - Lacquer Tracker', message:'If this account exists, a password reset e-mail has successfully sent.'});
                        }

                        transport.close();
                    });
                } else {
                    res.render('account/passwordforgot.ejs', {title: 'Retrieve Password - Lacquer Tracker', message:'If this account exists, a password reset e-mail has successfully sent.'});
                }
            } else {
                res.render('account/passwordforgot.ejs', {title: 'Retrieve Password - Lacquer Tracker', message:'If this account exists, a password reset e-mail has successfully sent.'});
            }
        }
    })
});


app.get('/reset/:key', function(req, res) {
    ResetKey.findById(req.params.key, function(err, resetkey) {
        if (err) {
            res.render('account/passwordforgot.ejs', {title: 'Retrieve Password - Lacquer Tracker', message:'That reset key is expired. Please request a new one.'});
        } else {
            if (new Date(resetkey.expiredate) > new Date()) {
                res.render('account/passwordreset.ejs', {title: 'Reset Password - Lacquer Tracker', username: resetkey.username, key: resetkey.id})
            } else {
                res.render('account/passwordforgot.ejs', {title: 'Retrieve Password - Lacquer Tracker', message:'That reset key is expired. Please request a new one.'});
            }
        }
    })
});


app.post('/reset/:key', function(req, res) {
    ResetKey.findById(req.params.key, function(err, resetkey) {
        if (err) {
            res.render('account/passwordforgot.ejs', {title: 'Retrieve Password - Lacquer Tracker', message:'That reset key is expired. Please request a new one.'});
        } else {
            if (new Date(resetkey.expiredate) > new Date()) {
                if (sanitizer.sanitize(req.body.password) === sanitizer.sanitize(req.body.confirm)) {
                    User.findOneAndUpdate({username: resetkey.username}, {password: bcrypt.hashSync(sanitizer.sanitize(req.body.password))}, function(err, user) {
                        res.redirect('/login');
                    });
                } else {
                    res.render('account/passwordreset.ejs', {title: 'Reset Password - Lacquer Tracker', username: resetkey.username, key: resetkey.id, message:'Passwords do not match.'})
                }
            } else {
                res.render('account/passwordforgot.ejs', {title: 'Retrieve Password - Lacquer Tracker', message:'That reset key is expired. Please request a new one.'});
            }
        }
    })
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