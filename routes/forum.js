var User = require('../app/models/user');
var ForumPost = require('../app/models/forumpost');
var ForumComment = require('../app/models/forumcomment');
var sanitizer = require('sanitizer');
var markdown = require('markdown-css');
var nodemailer = require('nodemailer');
var moment = require('moment-timezone');

module.exports = function(app, passport) {


//forums directory
app.get('/forums', function(req, res) {
    data = {}
    data.title = 'Forums - Lacquer Tracker';
    res.render('forums.ejs', data);
});




//add forum post
app.get('/forums/:forum/add', isLoggedIn, function(req, res) {
    data = {}
    data.title = 'Add a Discussion Post - Lacquer Tracker';
    data.forumcat = req.params.forum;
    res.render('forumsadd.ejs', data);
});

app.post('/forums/:forum/add', isLoggedIn, function(req, res) {
    var newForumPost = new ForumPost ({
        user: req.user.id,
        username: req.user.username,
        title: sanitizer.sanitize(req.body.posttitle),
        message: sanitizer.sanitize(req.body.postmessage),
        date: new Date(),
        dateupdated: new Date(),
        forum: req.body.forum,
    });
    newForumPost.save(function(err) {
        if (err) throw err;
        else res.redirect('/forums/' + newForumPost.forum + '/' + newForumPost.id);
    })
});



//view specific forum
app.get('/forums/:forum', function(req, res) {
    if (req.params.forum === "intro" || req.params.forum === "general" || req.params.forum === "notd" || req.params.forum === "contests" || req.params.forum === "tutorials" || req.params.forum === "offtopic" || req.params.forum === "lt") {
        data = {}
        data.title = req.params.forum + ' - Lacquer Tracker';
        data.forumcat = req.params.forum;
        ForumPost.find({forum: req.params.forum}).sort({date: -1}).populate('comments').populate('user').exec(function(err, posts) {
            User.populate(posts, {path:'comments.user'}, function(err) {
                var allposts = posts.map(function(x) {
                    if (req.isAuthenticated()) {
                        x.dateupdated = moment(x.dateupdated).tz(req.user.timezone).calendar();
                    } else {
                        x.dateupdated = moment(x.dateupdated).tz("America/New_York").calendar();
                    }
                    return x;
                })
                data.forumposts = allposts;
                res.render('forumsspecific.ejs', data);
            })
        })
    } else {
        res.redirect('/error');
    }
});




//view specific forum post
app.get('/forums/:forum/:id', function(req, res) {
    data = {};
    ForumPost.findById(req.params.id).populate('comments').populate('user').exec(function (err, post) {
        if (post === null || post === undefined) {
            res.redirect('/error');
        } else {
            data.title = post.title + " - Lacquer Tracker";
            data.postid = post.id;
            data.posttitle = post.title;
            data.postuser = post.user;
            data.postmessage = markdown(post.message);
            if (req.isAuthenticated()) {
                data.postdate = moment(post.date).tz(req.user.timezone).format('MMM D YYYY, h:mm a');
            } else {
                data.postdate = moment(post.date).tz("America/New_York").format('MMM D YYYY, h:mm a');
            }
            data.postforum = post.forum;
            User.populate(post, {path:'comments.user'}, function(err) {
                var allcomments = post.comments.map(function(x) {
                    if (req.isAuthenticated()) {
                        x.date = moment(x.date).tz(req.user.timezone).format('MMM D YYYY, h:mm a');
                    } else {
                        x.date = moment(x.date).tz("America/New_York").format('MMM D YYYY, h:mm a');
                    }
                    return x;
                })
                data.postcomments = allcomments;
                res.render('forumspost.ejs', data);
            })
        }
    })
});


//reply to specific comment
app.post('/forums/:forum/:id/:cid/add', isLoggedIn, function(req, res) {
    ForumPost.findById(req.params.id).populate('user').exec(function (err, post){
        var newForumComment = new ForumComment ({
            postid: post.id,
            parentid: req.params.cid,
            user: req.user.id,
            message: markdown(req.body.message),
            date: new Date(),
        })
        newForumComment.save(function(err) {
            if (req.user.username !== post.user.username && post.user.notifications === "on") {
                //mail notification
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
                    to: post.user.email,
                    //replace it with id you want to send multiple must be separated by ,(comma)
                    subject: 'New reply to your post',
                    text: "Hey " + post.user.username + ",\n\n" + req.user.username + " just replied to your forum post: " + post.title + "\n\nCome check it out here: http://www.lacquertracker.com/forums/" + post.forum + '/' + post.id + "\n\n\nThanks,\nLacquer Tracker",
                };

                //send Email
                smtpConfig.sendMail(mailOpts, function(err, result) {
                    if (err) {throw err};
                });
            }

            post.dateupdated = new Date();
            post.comments.push(newForumComment.id);
            ForumComment.findById(req.params.cid, function(err, parent) {
                if (parent) {
                    parent.childid.push(newForumComment.id);
                    post.save(function(err) {
                        parent.save(function(err) {
                            res.redirect('/forums/' + post.forum + '/' + post.id)
                        })
                    })
                } else {
                    post.save(function(err) {
                        res.redirect('/forums/' + post.forum + '/' + post.id)
                    })
                }
            })
        })
    })
});


//reply specific forum comment
app.get('/forums/:forum/:id/:cid/add', isLoggedIn, function(req, res) {
    data = {};
    ForumPost.findById(req.params.id).populate('user').exec(function (err, post) {
        if (post === null || post === undefined) {
            res.redirect('/error');
        } else {
            ForumComment.findById(req.params.cid).populate('user').exec(function(err, comment) {
                if (comment === null || comment === undefined) {
                    res.redirect('/error');
                } else {
                    data.replyid = req.params.cid;
                    data.title = post.title + " - Lacquer Tracker";
                    data.postid = post.id;
                    data.posttitle = post.title;
                    data.postuser = post.user;
                    data.postmessage = markdown(post.message);
                    data.postforum = post.forum;
                    if (req.isAuthenticated()) {
                        data.postdate = moment(post.date).tz(req.user.timezone).format('MMM D YYYY, h:mm a');
                        comment.date = moment(comment.date).tz(req.user.timezone).format('MMM D YYYY, h:mm a');
                    } else {
                        data.postdate = moment(post.date).tz("America/New_York").format('MMM D YYYY, h:mm a');
                        comment.date = moment(comment.date).tz("America/New_York").format('MMM D YYYY, h:mm a');
                    }
                    data.comment = comment;
                    res.render('forumspostreply.ejs', data);
                }
            })
        }
    })
});


//edit forum post
app.get('/forums/:forum/:id/edit', isLoggedIn, function(req, res) {
    data = {};
    ForumPost.findById(req.params.id).exec(function (err, post) {
        if (post === null || post === undefined) {
            res.redirect('/error');
        } else {
            if (post.user == req.user.id) {
                data.title = post.title + " - Lacquer Tracker";
                data.postid = post.id;
                data.posttitle = post.title;
                data.postmessage = post.message;
                data.postforum = post.forum;
                res.render('forumspostedit.ejs', data);
            } else {
                res.redirect('/error');
            }
        }
    })
});

app.post('/forums/:forum/:id/edit', isLoggedIn, function(req, res) {
    ForumPost.findById(req.params.id, function (err, post){
        if (post.user == req.user.id) {
            post.forum = req.body.forum;
            post.title = sanitizer.sanitize(req.body.posttitle);
            post.message = sanitizer.sanitize(req.body.postmessage);
            post.dateupdated = new Date();
            post.save();
            res.redirect('/forums/' + post.forum + '/' + post.id);
        } else {
            res.redirect('/error');
        }
    })
});



app.get('/forums/:forum/:id/add', isLoggedIn, function(req, res) {
    res.redirect('/forums/' + req.params.forum + '/' + req.params.id + "#addcomment")
});


//remove comment
app.get('/forums/:forum/:id/:cid/remove', isLoggedIn, function(req, res) {
    ForumComment.findById(req.params.cid, function(err, comment) {
        if (comment === null || comment === undefined) {
            res.redirect('/error');
        } else {
            if (comment.user == req.user.id || req.user.level === "admin") {
                if (comment.childid.length > 0) {
                    comment.message = sanitizer.sanitize(markdown("_deleted_"));
                    comment.save(function(err) {
                        res.redirect("/forums/" + req.params.forum + "/" + req.params.id);
                    })
                } else {
                    ForumPost.findById(req.params.id).remove({comments: req.params.cid});
                        ForumComment.findByIdAndRemove(req.params.cid, function(err) {
                        res.redirect("/forums/" + req.params.forum + "/" + req.params.id);
                    })
                }
            } else {
                res.redirect('/error');
            }
        }
    })
});


//admin remove comment -- admin only
app.get('/forums/:forum/:id/:cid/removepermanent', isLoggedIn, function(req, res) {
    if (req.user.level === "admin") {
        ForumComment.findById(req.params.cid, function(err, comment) {
            if (comment === null || comment === undefined) {
                res.redirect('/error');
            } else {
                ForumPost.findById(req.params.id).remove({comments: req.params.cid});
                ForumComment.findByIdAndRemove(req.params.cid, function(err) {
                    res.redirect("/forums/" + req.params.forum + "/" + req.params.id);
                })
            }
        })
    } else {
        res.redirect('/error');
    }
});


//remove forum post
app.get('/forums/:forum/:id/remove', isLoggedIn, function(req, res) {
    ForumPost.findById(req.params.id, function(err, post) {
        if (post === null || post === undefined) {
            res.redirect('/error');
        } else {
            if (post.user == req.user.id || req.user.level === "admin") {
                ForumPost.findByIdAndRemove(req.params.id, function(err) {
                    ForumComment.find({parentid : req.params.id}).remove();
                    res.redirect('/forums/' + req.params.forum);
                })
            } else {
                res.redirect('/error');
            }
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