var nodemailer = require('nodemailer');
var sanitizer = require('sanitizer');
var simple_recaptcha = require('simple-recaptcha');


module.exports = function(app, passport) {


app.get('/contact', function(req, res) {
    res.render('contact.ejs', {title: 'Contact - Lacquer Tracker'});
});

app.post('/contact', function (req, res) {

    var privateKey = '6Leqre8SAAAAAOKCKdo2WZdYwBcOfjbEOF3v2G99'; // your private key here
    var ip = req.ip;
    var challenge = req.body.recaptcha_challenge_field;
    var response = req.body.recaptcha_response_field;

    simple_recaptcha(privateKey, ip, challenge, response, function(err) {
        if (err) {
            res.render('contact.ejs', {title: 'Contact - Lacquer Tracker', message:'Captcha wrong. Try again.', inputname:req.body.name, inputemail:req.body.email, inputmessage:req.body.usermessage});
        } else {
            var transport = nodemailer.createTransport('sendmail', {
                path: "/usr/sbin/sendmail",
            });

            var mailOptions = {
                from: "polishrobot@lacquertracker.com",
                to: 'lacquertrackermailer@gmail.com',
                subject: 'Contact Form Submission',
                text: "Message from " + sanitizer.sanitize(req.body.name) + " - " + sanitizer.sanitize(req.body.email) + ":\n\n\n" + sanitizer.sanitize(req.body.usermessage)
            }

            transport.sendMail(mailOptions, function(error, response) {
                if (error) {
                    console.log(error);
                    res.render('contact.ejs', {title: 'Contact - Lacquer Tracker', message:'Could not send feedback. Please try again later.', inputname:req.body.name, inputemail:req.body.email, inputmessage:req.body.usermessage});
                } else {
                    res.render('contact.ejs', {title: 'Contact - Lacquer Tracker', message:'Feedback successfully sent!'});
                }

                transport.close();
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