var User = require('../app/models/user');
var UserPhoto = require('../app/models/userphoto');
var ForumPost = require('../app/models/forumpost');
var ForumComment = require('../app/models/forumcomment');
var sanitizer = require('sanitizer');
var markdown = require('markdown-css');
var nodemailer = require('nodemailer');
var moment = require('moment-timezone');
var _ = require('lodash');
var fs = require('node-fs');
var path = require('path');
var gm = require('gm').subClass({ imageMagick: true });
var http = require('http');

module.exports = function(app, passport) {

// //all forums together
// app.get('/forums', function(req, res) {
//     ForumPost.find({}).sort({dateupdated: -1}).populate('user', 'username').exec(function(err, posts) {
//         data = {};
//         data.title = 'Forums - Lacquer Tracker';
//         var allposts = posts.map(function(x) {
//             if (req.isAuthenticated() && req.user.timezone.length > 0) {
//                 x.dateupdated = moment(x.dateupdated).tz(req.user.timezone).calendar();
//             } else {
//                 x.dateupdated = moment(x.dateupdated).tz("America/New_York").calendar();
//             }
//             return x;
//         })
//         data.forumposts = allposts;
//         res.render('forums/allforums.ejs', data);
//     })
// });



//forums split out
app.get('/forums', function(req, res) {
    ForumPost.find({}).sort({dateupdated: -1}).exec(function(err, posts) {
        data = {};
        data.title = 'Forums - Lacquer Tracker';
        var latest = [];
        var latestdates = [];
        latest.push(_.find(posts, {'forum':'general'}));
        latest.push(_.find(posts, {'forum':'intro'}));
        latest.push(_.find(posts, {'forum':'offtopic'}));
        latest.push(_.find(posts, {'forum':'lt'}));
        for (i=0; i < latest.length; i++) {
            if (latest[i] !== undefined) {
                if (req.isAuthenticated() && req.user.timezone.length > 0) {
                    latestdates.push("Updated " + moment(latest[i].dateupdated).tz(req.user.timezone).calendar());
                } else {
                    latestdates.push("Updated " + moment(latest[i].dateupdated).tz("America/New_York").calendar());
                }
            } else {
                latestdates.push("Be the first!");
            }
        }
        data.latest = latestdates;
        res.render('forums/forums.ejs', data);
    })
});


//view specific forum
app.get('/forums/:forum', function(req, res) {
    if (req.params.forum === "intro" || req.params.forum === "general" || req.params.forum === "offtopic" || req.params.forum === "lt") {
        data = {}
        var allforums = ['intro', 'general', 'offtopic', 'lt'];
        var forumtitles = ['Introductions', 'General Polish Discussion', 'Off Topic', 'Lacquer Tracker Discussion'];
        for (i=0; i<allforums.length; i++) {
            if (req.params.forum === allforums[i]) {
                data.title = forumtitles[i] + ' - Lacquer Tracker';
            }
        }
        data.forumcat = req.params.forum;
        ForumPost.find({forum: req.params.forum}).sort({dateupdated: -1}).populate('comments').populate('user').exec(function(err, posts) {
            User.populate(posts, {path:'comments.user'}, function(err) {
                var allposts = posts.map(function(x) {
                    if (req.isAuthenticated() && req.user.timezone.length > 0) {
                        x.dateupdatednew = moment(x.dateupdated).tz(req.user.timezone).calendar();
                    } else {
                        x.dateupdatednew = moment(x.dateupdated).tz("America/New_York").calendar();
                    }
                    return x;
                })
                data.forumposts = allposts;
                res.render('forums/oneforum.ejs', data);
            })
        })
    } else {
        res.redirect('/error');
    }
});


//add forum post
app.get('/forums/:forum/add', isLoggedIn, function(req, res) {
    data = {}
    data.title = 'Add a Discussion Post - Lacquer Tracker';
    data.forumcat = req.params.forum;
    res.render('forums/add.ejs', data);
});

app.post('/forums/:forum/add', isLoggedIn, function(req, res) {
    var newForumPost = new ForumPost ({
        user: req.user.id,
        title: sanitizer.sanitize(req.body.posttitle),
        message: sanitizer.sanitize(req.body.postmessage),
        date: new Date(),
        dateupdated: new Date(),
        forum: sanitizer.sanitize(req.body.forum),
        comments: [],
        photo: '',
    });
    newForumPost.save(function(err) {
        if (req.files.photo.name.length > 0) {
            if (req.files.photo.mimetype.startsWith("image")) {
                var ext = path.extname(req.files.photo.name);
                    gm(req.files.photo.tempFilePath).strip().interlace('Plane').samplingFactor(4,2,0).quality(50).resize(60,60,"%").write(path.resolve('./public/images/forumphotos/' + newForumPost.id + ext), function (err) {
                        if (err) {
                            fs.unlink(req.files.photo.tempFilePath, function(err) {
                                newForumPost.remove();
                                res.redirect('/error');
                            })
                        } else {
                            fs.unlink(req.files.photo.tempFilePath, function() {
                                newForumPost.photo = '/images/forumphotos/' + newForumPost.id + ext;
                                newForumPost.save(function(err) {
                                    res.redirect('/forums/' + newForumPost.forum + '/' + newForumPost.id);
                                })
                            })
                        }
                    })
            } else {
                fs.unlink(req.files.photo.tempFilePath, function() {
                    res.redirect('/error');
                })
            }
        } else {
            res.redirect('/forums/' + newForumPost.forum + '/' + newForumPost.id);
        }
    })
});




//view specific forum post
app.get('/forums/:forum/:id', function(req, res) {
    data = {};
    ForumPost.findById(req.params.id).populate({path: 'comments', populate:{path:'user', select: 'username profilephoto'}}).populate('user', 'username').exec(function (err, post) {
        if (post === null || post === undefined) {
            res.redirect('/error');
        } else {
            data.title = post.title + " - Lacquer Tracker";
            data.postid = post.id;
            data.posttitle = post.title;
            data.postuser = post.user;
            data.postmessage = markdown(post.message);
            data.postphoto = post.photo;
            if (req.isAuthenticated() && req.user.timezone.length > 0) {
                data.postdate = moment(post.date).tz(req.user.timezone).format('MMM D YYYY, h:mm a');
            } else {
                data.postdate = moment(post.date).tz("America/New_York").format('MMM D YYYY, h:mm a');
            }
            data.postforum = post.forum;
            var allcomments = post.comments.map(function(x) {
                if (req.isAuthenticated() && req.user.timezone.length > 0) {
                    x.datenew = moment(x.date).tz(req.user.timezone).format('MMM D YYYY, h:mm a');
                } else {
                    x.datenew = moment(x.date).tz("America/New_York").format('MMM D YYYY, h:mm a');
                }
                if (x.message == "<p><em>comment deleted</em></p>\n") {
                    x.user.username = '';
                    x.user.profilephoto = '';
                }
                return x;
            })
            data.postcomments = allcomments;
            res.render('forums/view.ejs', data);
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
            message: markdown(sanitizer.sanitize(req.body.message)),
            date: new Date(),
        })
        newForumComment.save(function(err) {
            ForumComment.findById(req.params.cid).populate('user').exec(function(err, comment) {
                if (comment !== null) {
                    if (req.user.username !== comment.user.username && comment.user.notifications === "on" && comment.user.username !== post.user.username) {
                        //mail notification
                        var transport = nodemailer.createTransport({
                            sendmail: true,
                            path: "/usr/sbin/sendmail"
                        });

                        var mailOptions = {
                            from: "polishrobot@lacquertracker.com",
                            to: comment.user.email,
                            subject: 'New reply to your forum comment',
                            text: "Hey " + comment.user.username + ",\n\n" + req.user.username + " just replied to your comment on forum post: " + post.title + "\n\nCome check it out here: https://www.lacquertracker.com/forums/" + post.forum + '/' + post.id + "\n\n\nThanks,\nLacquer Tracker",
                        }

                        transport.sendMail(mailOptions, function(error, response) {
                            transport.close();
                        });
                    }
                }

                if (req.user.username !== post.user.username && post.user.notifications === "on") {
                    //mail notification
                    var transport = nodemailer.createTransport({
                        sendmail: true,
                        path: "/usr/sbin/sendmail"
                    });

                    var mailOptions = {
                        from: "polishrobot@lacquertracker.com",
                        to: post.user.email,
                        subject: 'New reply to your post',
                        text: "Hey " + post.user.username + ",\n\n" + req.user.username + " just replied to your forum post: " + post.title + "\n\nCome check it out here: https://www.lacquertracker.com/forums/" + post.forum + '/' + post.id + "\n\n\nThanks,\nLacquer Tracker",
                    }

                    transport.sendMail(mailOptions, function(error, response) {
                        transport.close();
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
                data.postphoto = post.photo;
                res.render('forums/edit.ejs', data);
            } else {
                res.redirect('/error');
            }
        }
    })
});

app.post('/forums/:forum/:id/edit', isLoggedIn, function(req, res) {
    ForumPost.findById(req.params.id, function (err, post){
        if (post.user == req.user.id) {
            post.forum = sanitizer.sanitize(req.body.forum);
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

app.get('/forums/:forum/:id/addreply', isLoggedIn, function(req, res) {
    res.redirect('/forums/' + req.params.forum + '/' + req.params.id)
});


//remove comment
app.get('/forums/:forum/:id/:cid/remove', isLoggedIn, function(req, res) {
    ForumPost.findById(req.params.id, function(err, post) {
        ForumComment.findById(req.params.cid, function(err, comment) {
            if (comment === null || comment === undefined) {
                res.redirect('/error');
            } else {
                if (comment.user == req.user.id || req.user.level === "admin") {
                    if (comment.childid.length > 0) {
                        comment.message = sanitizer.sanitize(markdown("_comment deleted_"));
                        comment.save(function(err) {
                            res.redirect("/forums/" + req.params.forum + "/" + req.params.id);
                        })
                    } else {
                        post.comments.remove(req.params.cid);
                        post.save(function(err) {
                            if (comment.parentid !== comment.postid) {
                                ForumComment.findById(comment.parentid, function(err, parentcomment) {
                                    parentcomment.childid.remove(req.params.cid);
                                    parentcomment.save();
                                    ForumComment.findByIdAndRemove(req.params.cid, function(err) {
                                        res.redirect("/forums/" + req.params.forum + "/" + req.params.id);
                                    })
                                })
                            } else {
                                ForumComment.findByIdAndRemove(req.params.cid, function(err) {
                                    res.redirect("/forums/" + req.params.forum + "/" + req.params.id);
                                })
                            }
                        })
                    }
                } else {
                    res.redirect('/error');
                }
            }
        })
    })
});



//delete forum post
app.get('/forums/:forum/:id/remove', isLoggedIn, function(req, res) {
    ForumPost.findById(req.params.id, function(err, post) {
        if (post === null || post === undefined) {
            res.redirect('/error');
        } else {
            if (post.user == req.user.id || req.user.level === "admin") {
                ForumComment.find({postid:req.params.id}, function(err, comments) {
                    for (i=0; i < comments.length; i++) {
                        comments[i].remove();
                    }
                    fs.unlink(path.resolve('./public/'+post.photo), function(err) {
                        ForumPost.findByIdAndRemove(req.params.id, function(err) {
                            res.redirect('/forums');
                        })
                    })
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
    req.user.lastlogindate = new Date;
    req.user.save();
    return next();

    //if they aren't, redirect them to the login page
    req.session.returnTo = req.path;
    res.redirect('/login');
};