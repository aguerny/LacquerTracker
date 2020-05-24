var Polish = require('../app/models/polish');
var User = require('../app/models/user');
var Review = require('../app/models/review');
var Photo = require('../app/models/photo');
var UserPhoto = require('../app/models/userphoto');
var Checkin = require('../app/models/checkin');
var CheckinComment = require('../app/models/checkincomment');
var ForumPost = require('../app/models/forumpost');
var ForumComment = require('../app/models/forumcomment');
var sanitizer = require('sanitizer');
var markdown = require('markdown-css');
var _ = require('lodash');
var fs = require('node-fs');
var path = require('path');
var bcrypt = require("bcrypt-nodejs");
var PolishColors = require('../app/constants/polishColors');
var nodemailer = require('nodemailer');
var request = require('request');



module.exports = function(app, passport) {


//profile general
app.get('/profile', isLoggedIn, function(req, res) {
    User.findOne({username: req.user.username}, function (err, user) {
        var username = req.user.username;
        res.redirect('/profile/' + username);
    })
});


//profile specific
app.get('/profile/:username', function(req, res) {
    User.findOne({username: new RegExp(["^", sanitizer.sanitize(req.params.username), "$"].join(""), "i"), level:{$ne:"deleted"}}).populate('ownedpolish').populate('wantedpolish').populate('checkins', 'photo pendingdelete creationdate polish', null, {sort:{creationdate:-1}}).exec(function(err, user) {
        if (!user || user.username==="admin" || user.username==="lacquertracker") {
            res.redirect('/error');
        } else {
            var data = {};
            data.title = user.username + "'s Profile - Lacquer Tracker";
            var osort = user.ownedpolish.sort(function (a, b) {return a.name.toLowerCase().localeCompare(b.name.toLowerCase());});
            var osort2 = _.sortBy(osort, function(b) {return b.brand.toLowerCase();});
            data.opolishes = [];
            data.oaccessories = [];
            for (i=0; i<osort2.length; i++) {
                if (osort2[i].tool == true) {
                    data.oaccessories.push(osort2[i]);
                } else {
                    data.opolishes.push(osort2[i]);
                }
            }
            var wsort = user.wantedpolish.sort(function (a, b) {return a.name.toLowerCase().localeCompare(b.name.toLowerCase());});
            var wsort2 = _.sortBy(wsort, function(b) {return b.brand.toLowerCase();});
            data.wpolishes = wsort2;
            data.username = user.username;
            data.about = markdown(user.about);
            data.profilephoto = user.profilephoto;
            data.notifications = user.notifications;
            data.useremail = user.useremail;
            data.colors = PolishColors;
            data.checkins = user.checkins;
            var oreviews = [];
            var areviews = [];
            Review.find({user:user.id}).populate('polish').exec(function(err, reviews) { //need to fix
                for (i=0; i<reviews.length; i++) {
                    var polishindex = _.findIndex(data.opolishes, {'id':reviews[i].polish.id});
                    oreviews[polishindex] = reviews[i];
                    var accessoryindex = _.findIndex(data.oaccessories, {'id':reviews[i].polish.id});
                    areviews[accessoryindex] = reviews[i];
                }
                data.oreviews = oreviews;
                data.areviews = areviews;
                res.render('profile/profile.ejs', data);
            })
        }
    });
});

///////////////////////////////////////////////////////////////////////////


//edit profile
app.get('/profile/edit', isLoggedIn, function(req, res) {
    var usernamee = req.user.username;
    res.redirect('/profile/edit/' + usernamee);
});


app.get('/profile/:username/edit', isLoggedIn, function(req, res) {
    if (req.params.username === req.user.username) {
        User.findOne({username : new RegExp(["^", sanitizer.sanitize(req.params.username), "$"].join(""), "i")}).exec(function(err, user) {
        var data = {};
            data.title = 'Edit Your Profile - Lacquer Tracker';
            data.userid = user.id;
            data.username = user.username;
            data.email = user.email;
            data.about = user.about;
            yesphotos = [];
            nophotos = [];
            data.notifications = user.notifications;
            data.country = user.country;
            data.timezone = user.timezone;
        res.render('profile/profileedit.ejs', data);
        })
    } else {
        res.redirect('/error');
    }
});

app.post('/profile/:username/edit', isLoggedIn, function(req, res) {
    User.findOne({username:new RegExp(["^", sanitizer.sanitize(req.params.username), "$"].join(""), "i")}, function(err, user) {
        if (!user) {
            res.redirect('/error');
        } else {
            user.email = sanitizer.sanitize(req.body.email);
            user.about = sanitizer.sanitize(req.body.about);
            user.country = sanitizer.sanitize(req.body.country);
            user.timezone = sanitizer.sanitize(req.body.timezone);
            if (req.body.notifications) {
                user.notifications = sanitizer.sanitize(req.body.notifications);
            } else {
                user.notifications = "off";
            }
            user.save(function(err) {
                res.redirect('/profile/' + req.user.username);
            });
        }
    });
});


//delete user profile
app.get('/profile/:username/delete', isLoggedIn, function(req, res) {
    if (req.user.level === "admin") {
        User.findOne({username:new RegExp(["^", sanitizer.sanitize(req.params.username), "$"].join(""), "i")}).populate('checkins').exec(function(err, user) {
            if (!user) {
                res.redirect('/error');
            } else {
                user.deleted = true;
                user.password = bcrypt.hashSync(Math.random().toString(36).substring(20), bcrypt.genSaltSync(8), null);
                user.email = user.email+".deleted";
                user.about = '';
                user.ownedpolish = [];
                user.wantedpolish = [];
                fs.unlink(path.resolve('./public/'+user.profilephoto), function(err) {
                    //removing
                })
                user.profilephoto = '';
                user.level = "deleted";
                user.adminview = false;
                user.notifications = "off";
                user.useremail = "off";
                CheckinComment.find({user:user.id}, function(err, comments) {
                    for (i=0; i<comments.length; i++) {
                        var comment = comments[i];
                        if (comments[i].childid.length > 0) {
                            comments[i].message = sanitizer.sanitize(markdown("_comment deleted_"));
                            comments[i].save();
                        } else {
                            Checkin.findById(comments[i].checkinid, function(err, checkin) {
                                checkin.comments.remove(comment.id);
                                checkin.save(function(err) {
                                    if (comment.parentid !== comment.checkinid) {
                                        CheckinComment.findById(comment.parentid, function(err, parentcomment) {
                                            if (parentcomment) {
                                                parentcomment.childid.remove(comment.id);
                                                parentcomment.save();
                                            }
                                            comment.remove();
                                        })
                                    } else {
                                        comment.remove();
                                    }
                                })
                            })
                        }
                    }
                    for (i=0; i<user.checkins.length; i++) {
                        var checkin = user.checkins[i].id;
                        var thischeckin = user.checkins[i];
                        for (j=0; j<user.checkins[i].savedby.length; j++) {
                            User.findById(thischeckin.savedby[j]).exec(function(err, checkinuser) {
                                checkinuser.savedcheckins.remove(checkin);
                                checkinuser.save();
                            })
                        }
                        Checkin.findById(user.checkins[i].id).populate('polish').exec(function (err, checkin) {
                            CheckinComment.find({checkinid:checkin.id}, function(err, comments) {
                                for (j=0; j < comments.length; j++) {
                                    comments[j].remove();
                                }
                                fs.unlink(path.resolve('./public/'+checkin.photo), function(err) {
                                    for (j=0; j<checkin.polish.length; j++) {
                                        Polish.findById(checkin.polish[j]).exec(function(err, polish) {
                                            polish.checkins.remove(checkin.id);
                                            polish.save();
                                        })
                                    }
                                    checkin.remove();
                                    user.checkins.remove(checkin);
                                    user.save();
                                })
                            })
                        })
                    }
                })
                ForumComment.find({user:user.id}, function(err, comments) {
                    for (i=0; i<comments.length; i++) {
                        var forumcomment = comments[i];
                        if (comments[i].childid.length > 0) {
                            comments[i].message = sanitizer.sanitize(markdown("_comment deleted_"));
                            comments[i].save();
                        } else {
                            ForumPost.findById(forumcomment.postid, function(err, post) {
                                post.comments.remove(forumcomment.id);
                                post.save(function(err) {
                                    if (forumcomment.parentid !== forumcomment.postid) {
                                        ForumComment.findById(forumcomment.parentid, function(err, parentcomment) {
                                            if (parentcomment) {
                                                parentcomment.childid.remove(forumcomment.id);
                                                parentcomment.save();
                                            }
                                            forumcomment.remove();
                                        })
                                    } else {
                                        forumcomment.remove();
                                    }
                                })
                            })
                        }
                    }
                    ForumPost.find({user:user.id}, function(err, posts) {
                        for (i=0; i<posts.length; i++) {
                            var post = posts[i];
                            ForumComment.find({postid:posts[i].id}, function(err, comments) {
                                for (j=0; j < comments.length; j++) {
                                    comments[j].remove();
                                }
                            })
                            fs.unlink(path.resolve('./public/'+post.photo), function(err) {
                                //removing
                            })
                            post.remove();
                        }
                    })
                })
                Review.find({user:user.id}).exec(function(err, reviews) {
                    for (i=0; i<reviews.length; i++) {
                        var reviewid = reviews[i].id;
                        console.log(reviews[i].id);
                        Polish.findById(reviews[i].polish).exec(function (err, polish) {
                            polish.reviews.remove(reviewid);
                            polish.save(function(err) {
                                Review.find({polish: polish.id}, function (err, reviews) {
                                    if (reviews.length > 0) {
                                        var ratings = reviews.map(function(x) {
                                            if (x.rating.length > 0) {
                                                return parseInt(x.rating);
                                            }
                                        })
                                        polish.avgrating = _.mean(ratings);
                                        polish.save();
                                    }
                                })
                            });
                        })
                        reviews[i].remove();
                    }
                });
                user.save();
                res.redirect('/browse');
            }
        })
    } else {
        res.redirect('/error');
    }
});



////////////////////////////////////////////////////////////////////////////////////////////

//send a user a message
app.get('/profile/:username/message', isLoggedIn, function(req, res) {
    User.findOne({username:new RegExp(["^", sanitizer.sanitize(req.params.username), "$"].join(""), "i")}, function(err, user) {
        if (err || !user || user.useremail==="off") {
            res.redirect('/error');
        } else {
            data = {};
            data.title = 'Send Message - Lacquer Tracker';
            data.username = user.username;
            res.render('profile/message.ejs', data)
        }
    })
});


app.post('/profile/:username/message', isLoggedIn, function(req, res) {

    if (req.body['g-recaptcha-response'] === undefined || req.body['g-recaptcha-response'] === '' || req.body['g-recaptcha-response'] === null) {
        res.render('profile/message.ejs', {title: 'Send Message - Lacquer Tracker', message: 'Captcha wrong. Try again.', emailmessage:sanitizer.sanitize(req.body.emailmessage), username:sanitizer.sanitize(req.params.username)});
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
            res.render('profile/message.ejs', {title: 'Send Message - Lacquer Tracker', message: 'Captcha wrong. Try again.', emailmessage:sanitizer.sanitize(req.body.emailmessage), username:sanitizer.sanitize(req.params.username)});
        }
        if (body.success === true) {
            User.findOne({ 'username' : new RegExp(["^", sanitizer.sanitize(req.params.username), "$"].join(""), "i")}, function(err, user) {
                if (user) {
                    //send e-mail
                    var transport = nodemailer.createTransport({
                        sendmail: true,
                        path: "/usr/sbin/sendmail"
                    });

                    var mailOptions = {
                        from: "polishrobot@lacquertracker.com",
                        to: user.email,
                        subject: 'Message from ' + req.user.username,
                        text: "Hi " + user.username + ",\n\n" + req.user.username + " has sent you the following message through Lacquer Tracker:\n\n" + sanitizer.sanitize(req.body.emailmessage) + "\n\n**Do not reply to directly to this e-mail. To respond to the sender, click here: https://www.lacquertracker.com/profile/"+req.user.username+"/message\n\n\nHappy polishing,\nLacquer Tracker",
                    }

                    transport.sendMail(mailOptions, function(error, response) {
                        if (error) {
                            res.render('profile/message.ejs', {title: 'Send Message - Lacquer Tracker', message:'Error sending message. Please try again later.', emailmessage:sanitizer.sanitize(req.body.emailmessage), username:sanitizer.sanitize(req.params.username)});
                        } else {
                            res.render('profile/message.ejs', {title: 'Send Message - Lacquer Tracker', message: 'Success! Message sent.', username:user.username});
                        }

                        transport.close();
                    });
                } else {
                   res.render('profile/message.ejs', {title: 'Send Message - Lacquer Tracker', message:'User not found. Please try again later.', emailmessage:sanitizer.sanitize(req.body.emailmessage), username:sanitizer.sanitize(req.params.username)});
                }
            });
        } else {
            res.render('profile/message.ejs', {title: 'Send Message - Lacquer Tracker', message:'Error sending message. Please try again later.', emailmessage:sanitizer.sanitize(req.body.emailmessage), username:sanitizer.sanitize(req.params.username)});
        }
    });
});



};



//route middleware to make sure a user is logged in
function isLoggedIn(req, res, next) {

    if (req.isAuthenticated()) {
        User.findById(req.user.id).exec(function(err, user) {
            user.lastlogindate = new Date();
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