//contact
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