var User = require('../app/models/user');
var sanitizer = require('sanitizer');
var nodemailer = require('nodemailer');
var simple_recaptcha = require('simple-recaptcha');


module.exports = function(app, passport) {


//send e-mail
app.get('/email/:username', isLoggedIn, function(req, res) {
    User.findOne({username:req.params.username}, function(err, user) {
        if (err || !user || user.useremail==="off") {
            res.redirect('/error');
        } else if (user.useremail === "on") {
            data = {};
            data.title = 'Send Message - Lacquer Tracker';
            data.username = user.username;
            res.render('emailuser.ejs', data)
        }
    })
});


app.post('/email/:username', isLoggedIn, function(req, res) {
    User.findOne({username:req.params.username}, function(err, user) {
        if (err || !user || user.useremail==="off") {
            res.redirect('/error');
        } else if (user.useremail === "on") {
            var privateKey = '6Leqre8SAAAAAOKCKdo2WZdYwBcOfjbEOF3v2G99'; // your private key here
            var ip = req.ip;
            var challenge = req.body.recaptcha_challenge_field;
            var response = req.body.recaptcha_response_field;

            simple_recaptcha(privateKey, ip, challenge, response, function(err) {
                if (err) {
                    res.render('emailuser.ejs', {title: 'Send Message - Lacquer Tracker', message: 'Captcha wrong. Try again.', emailmessage:req.body.emailmessage, username:user.username});
                } else {
                    //send e-mail
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
                        from: "noreply@lacquertracker.com",
                        to: user.email,
                        //replace it with id you want to send multiple must be separated by ,(comma)
                        subject: 'Message from ' + req.user.username,
                        text: "Hey " + user.username + ",\n\n" + req.user.username + " has sent you the following message:\n\n" + sanitizer.sanitize(req.body.emailmessage) + "\n\nThanks,\nLacquer Tracker",
                    };

                    //send Email
                    smtpConfig.sendMail(mailOpts, function (error, response) {

                        //Email not sent
                        if (error) {
                            res.render('emailuser.ejs', {title: 'Send Message - Lacquer Tracker', message:'Error sending message. Please try again later.', emailmessage:req.body.emailmessage, username:user.username});
                        }

                        //email sent successfully
                        else {
                            res.render('emailuser.ejs', {title: 'Send Message - Lacquer Tracker', message: 'Success! Message sent.', username:user.username});
                        }
                    });
                }
            })
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