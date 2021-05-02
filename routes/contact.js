var nodemailer = require('nodemailer');
var sanitizer = require('sanitizer');
var request = require('request');
var User = require('../app/models/user');

module.exports = function(app, passport) {


app.get('/contact', function(req, res) {
    res.render('contact.ejs', {title: 'Contact - Lacquer Tracker'});
});

app.post('/contact', function (req, res) {

    if (req.body['g-recaptcha-response'] === undefined || req.body['g-recaptcha-response'] === '' || req.body['g-recaptcha-response'] === null) {
        res.render('contact.ejs', {title: 'Contact - Lacquer Tracker', message:'Captcha wrong. Please try again.', inputname:sanitizer.sanitize(req.body.name), inputemail:sanitizer.sanitize(req.body.email), inputmessage:sanitizer.sanitize(req.body.usermessage)});
    } else {
        // Put your secret key here.
        var secretKey = process.env.LTRECAPTCHASECRETKEY;
        // req.connection.remoteAddress will provide IP address of connected user.
        var verificationUrl = "https://www.google.com/recaptcha/api/siteverify?secret=" + secretKey + "&response=" + req.body['g-recaptcha-response'] + "&remoteip=" + req.connection.remoteAddress;
        // Hitting GET request to the URL, Google will respond with success or error scenario.
        request(verificationUrl,function(error,response,body) {
            body = JSON.parse(body);
            // Success will be true or false depending upon captcha validation.
            if(body.success !== undefined && !body.success) {
                res.render('contact.ejs', {title: 'Contact - Lacquer Tracker', message:'Captcha wrong. Try again.', inputname:sanitizer.sanitize(req.body.name), inputemail:sanitizer.sanitize(req.body.email), inputmessage:sanitizer.sanitize(req.body.usermessage)});
            }
            if (body.success === true) {
                var transport = nodemailer.createTransport({
                    sendmail: true,
                    path: "/usr/sbin/sendmail"
                });

                var mailOptions = {
                    from: "polishrobot@lacquertracker.com",
                    replyTo: sanitizer.sanitize(req.body.email),
                    to: 'lacquertrackermailer@gmail.com',
                    subject: 'Contact Form Submission',
                    text: "Message from " + sanitizer.sanitize(req.body.name) + " - " + sanitizer.sanitize(req.body.email) + ":\n\n" + sanitizer.sanitize(req.body.usermessage)
                }

                transport.sendMail(mailOptions, function(error, response) {
                    if (error) {
                        res.render('contact.ejs', {title: 'Contact - Lacquer Tracker', message:'Could not send feedback. Please try again later.', inputname:req.body.name, inputemail:req.body.email, inputmessage:req.body.usermessage});
                    } else {
                        res.render('contact.ejs', {title: 'Contact - Lacquer Tracker', message:'Feedback successfully sent!'});
                    }

                    transport.close();
                });
            } else {
                res.render('contact.ejs', {title: 'Contact - Lacquer Tracker', message:'Could not send feedback. Please try again later.', inputname:sanitizer.sanitize(req.body.name), inputemail:sanitizer.sanitize(req.body.email), inputmessage:sanitizer.sanitize(req.body.usermessage)});
            }
        })
    }
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