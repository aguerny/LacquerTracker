var mongoose = require('mongoose');
var nodemailer = require('nodemailer');
var sanitizer = require('sanitizer');
var simple_recaptcha = require('simple-recaptcha');


module.exports = function(app, passport) {


app.get('/contact', function(req, res) {
    res.render('contact.ejs', {title: 'Contact - Lacquer Tracker', message:req.flash('contactmessage')});
});

app.post('/contact', function (req, res) {

    var privateKey = '6Leqre8SAAAAAOKCKdo2WZdYwBcOfjbEOF3v2G99'; // your private key here
    var ip = req.ip;
    var challenge = req.body.recaptcha_challenge_field;
    var response = req.body.recaptcha_response_field;

    simple_recaptcha(privateKey, ip, challenge, response, function(err) {
        if (err) {
            req.flash('contactMessage', 'Captcha wrong. Try again.');
            res.render('contact.ejs', {title: 'Contact - Lacquer Tracker', message:req.flash('contactMessage'), inputname:req.body.name, inputemail:req.body.email, inputmessage:req.body.usermessage});
        } else {
            var mailOpts, smtpConfig;
            smtpConfig = nodemailer.createTransport('SMTP', {
                service: 'Gmail',
                auth: {
                    user: "lacquertrackermailer@gmail.com",
                    pass: "testpassword456"
                }
            });

            //construct the email sending module
            mailOpts = {
                from: sanitizer.sanitize(req.body.name) + sanitizer.sanitize(req.body.email),
                to: 'alligiveaway@gmail.com',
                //replace it with id you want to send multiple must be separated by ,(comma)
                subject: 'Contact Form Submission',
                text: "Message from " + sanitizer.sanitize(req.body.name) + " @ " + sanitizer.sanitize(req.body.email) + ":\n\n\n" + sanitizer.sanitize(req.body.usermessage)
            };

            //send Email
                smtpConfig.sendMail(mailOpts, function (error, response) {

            //Email not sent
            if (error) {
                req.flash('contactMessage', 'Could not send feedback. Please try again later.');
                res.render('contact.ejs', {title: 'Contact - Lacquer Tracker', message:req.flash('contactMessage'), inputname:req.body.name, inputemail:req.body.email, inputmessage:req.body.usermessage});
            }

            //email sent successfully
            else {
                req.flash('contactMessage', 'Feedback successfully sent!');
                res.render('contact.ejs', {title: 'Contact - Lacquer Tracker', message:req.flash('contactMessage')});
            }
            });
        }
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