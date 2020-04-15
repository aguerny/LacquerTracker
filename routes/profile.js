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


module.exports = function(app, passport) {


//profile general
app.get('/profile', isLoggedIn, function(req, res) {
    User.findOne({username: req.user.username}, function (err, user) {
        user.lastlogindate = new Date;
        user.save(function(err) {
            var username = req.user.username;
            res.redirect('/profile/' + username);
        })
    })
});


//profile specific
app.get('/profile/:username', function(req, res) {
    User.findOne({username: req.params.username, level:{$ne:"deleted"}}).populate('ownedpolish').populate('wantedpolish').populate('checkins', 'photo pendingdelete creationdate', null, {sort:{creationdate:-1}}).exec(function(err, user) {
        if (!user || user.username==="admin" || user.username==="lacquertracker") {
            res.redirect('/error');
        } else {
            var data = {};
            data.title = user.username + "'s Profile - Lacquer Tracker";
            var osort = user.ownedpolish.sort(function (a, b) {return a.name.toLowerCase().localeCompare(b.name.toLowerCase());});
            var osort2 = _.sortBy(osort, function(b) {return b.brand.toLowerCase();});
            var wsort = user.wantedpolish.sort(function (a, b) {return a.name.toLowerCase().localeCompare(b.name.toLowerCase());});
            var wsort2 = _.sortBy(wsort, function(b) {return b.brand.toLowerCase();});
            data.opolishes = osort2;
            data.wpolishes = wsort2;
            data.username = user.username;
            data.about = markdown(user.about);
            data.profilephoto = user.profilephoto;
            data.notifications = user.notifications;
            data.useremail = user.useremail;
            data.colors = PolishColors;
            data.checkins = user.checkins;
            var oreviews = [];
            Review.find({user:user.id}).populate('polish').exec(function(err, reviews) {
                for (i=0; i<reviews.length; i++) {
                    var thisindex = _.findIndex(osort2, {'id':reviews[i].polish.id});
                    oreviews[thisindex] = reviews[i];
                }
                data.oreviews = oreviews;
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
        User.findOne({username : req.params.username}).exec(function(err, user) {
        var data = {};
            data.title = 'Edit Your Profile - Lacquer Tracker';
            data.userid = user.id;
            data.username = user.username;
            data.email = user.email;
            data.about = user.about;
            yesphotos = [];
            nophotos = [];
            data.notifications = user.notifications;
            data.useremail = user.useremail;
            data.country = user.country;
            data.timezone = user.timezone;
        res.render('profile/profileedit.ejs', data);
        })
    } else {
        res.redirect('/error');
    }
});

app.post('/profile/:username/edit', isLoggedIn, function(req, res) {
    User.findOne({username:req.params.username}, function(err, user) {
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
            if (req.body.useremail) {
                user.useremail = sanitizer.sanitize(req.body.useremail);
            } else {
                user.useremail = "off";
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
        User.findOne({username:req.params.username}).populate('checkins').exec(function(err, user) {
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
                            polish.save();
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