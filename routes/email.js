var User = require('../app/models/user');
var sanitizer = require('sanitizer');
var nodemailer = require('nodemailer');
var request = require('request');


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
            res.render('profile/emailuser.ejs', data)
        }
    })
});


app.post('/email/:username', isLoggedIn, function(req, res) {

    if (req.body['g-recaptcha-response'] === undefined || req.body['g-recaptcha-response'] === '' || req.body['g-recaptcha-response'] === null) {
        res.render('profile/emailuser.ejs', {title: 'Send Message - Lacquer Tracker', message: 'Captcha wrong. Try again.', emailmessage:req.body.emailmessage, username:user.username});
    }
    // Put your secret key here.
    var secretKey = "6LcxIzgUAAAAAA-GeS9omdvbuGvc6eNLCmH09-TN";
    // req.connection.remoteAddress will provide IP address of connected user.
    var verificationUrl = "https://www.google.com/recaptcha/api/siteverify?secret=" + secretKey + "&response=" + req.body['g-recaptcha-response'] + "&remoteip=" + req.connection.remoteAddress;
    // Hitting GET request to the URL, Google will respond with success or error scenario.
    request(verificationUrl,function(error,response,body) {
        body = JSON.parse(body);
        // Success will be true or false depending upon captcha validation.
        if(body.success !== undefined && !body.success) {
            res.render('profile/emailuser.ejs', {title: 'Send Message - Lacquer Tracker', message: 'Captcha wrong. Try again.', emailmessage:req.body.emailmessage, username:user.username});
        }
        if (body.success === true) {
            //send e-mail
            var transport = nodemailer.createTransport({
                sendmail: true,
                path: "/usr/sbin/sendmail"
            });

            var mailOptions = {
                from: "polishrobot@lacquertracker.com",
                to: user.email,
                subject: 'Message from ' + req.user.username,
                text: "Hey " + user.username + ",\n\n" + req.user.username + " has sent you the following message:\n\n" + sanitizer.sanitize(req.body.emailmessage) + "\n\n\nThanks,\nLacquer Tracker\n\n**Please do not reply to directly to this e-mail; the Polish Robot needs its rest. The sender should have included a reply-to e-mail address.**",
            }

            transport.sendMail(mailOptions, function(error, response) {
                if (error) {
                    res.render('profile/emailuser.ejs', {title: 'Send Message - Lacquer Tracker', message:'Error sending message. Please try again later.', emailmessage:req.body.emailmessage, username:user.username});
                } else {
                    res.render('profile/emailuser.ejs', {title: 'Send Message - Lacquer Tracker', message: 'Success! Message sent.', username:user.username});
                }

                transport.close();
            });
        } else {
            res.render('profile/emailuser.ejs', {title: 'Send Message - Lacquer Tracker', message:'Error sending message. Please try again later.', emailmessage:req.body.emailmessage, username:user.username});
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