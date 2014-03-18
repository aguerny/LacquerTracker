var mongoose = require('mongoose');
var User = require('../app/models/user');
var UserPhoto = require('../app/models/userphoto');
var ForumPost = require('../app/models/forumpost');
var ForumComment = require('../app/models/forumcomment');
var sanitizer = require('sanitizer');
var markdown = require('markdown').markdown;
var pagedown = require("pagedown");
var safeConverter = pagedown.getSanitizingConverter();



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
    var m_names = new Array("Jan", "Feb", "Mar", "Apr", "May", "June", "July", "Aug", "Sep", "Oct", "Nov", "Dec");
    var d = new Date();
    var curr_date = d.getDate();
    var curr_month = d.getMonth();
    var curr_year = d.getFullYear();
    var curr_day = d.getDay();
    var curr_hour = d.getHours();
    var curr_min = d.getMinutes();
    if (curr_min < 10) {curr_min = "0" + curr_min;}
    var suffix = "am";
    if (curr_hour >= 12) {suffix = "pm"; curr_hour = curr_hour - 12;}
    if (curr_hour == 0) {curr_hour = 12;}
    var dateformatted = m_names[curr_month] + " " + curr_date + " " + curr_year + ", " + curr_hour + ":" + curr_min + " " + suffix;

    var newForumPost = new ForumPost ({
        user: req.user.id,
        username: req.user.username,
        title: sanitizer.sanitize(req.body.posttitle),
        message: sanitizer.sanitize(req.body.postmessage),
        datefull: new Date(),
        dateupdated: dateformatted,
        date: dateformatted,
        forum: req.body.forum,
    });
    newForumPost.save(function(err) {
        if (err) throw err;
        else res.redirect('/forums/' + newForumPost.forum + '/' + newForumPost.id);
    })
});



//view specific forum
app.get('/forums/:forum', function(req, res) {
    if (req.params.forum === "intro" || req.params.forum === "general" || req.params.forum === "notd" || req.params.forum === "contests" || req.params.forum === "tutorials" || req.params.forum === "offtopic") {
        data = {}
        data.title = req.params.forum + ' - Lacquer Tracker';
        data.forumcat = req.params.forum;
        ForumPost.find({forum: req.params.forum}).sort({dateupdated: -1}).populate('comments').populate('user').exec(function(err, posts) {
            User.populate(posts, {path:'comments.user'}, function(err) {
                data.forumposts = posts;
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
        if (post === null) {
            res.redirect('/error');
        } else {
            data.title = post.title + " - Lacquer Tracker";
            data.postid = post.id;
            data.posttitle = post.title;
            data.postuser = post.user;
            data.postmessage = safeConverter.makeHtml(post.message);
            data.postdate = post.date;
            data.postforum = post.forum;
            User.populate(post, {path:'comments.user'}, function(err) {
                data.postcomments = post.comments;
                res.render('forumspost.ejs', data);
            })
        }
    })
});

app.post('/forums/:forum/:id/:cid/add', isLoggedIn, function(req, res) {
    ForumPost.findById(req.params.id, function (err, post){
        var m_names = new Array("Jan", "Feb", "Mar", "Apr", "May", "June", "July", "Aug", "Sep", "Oct", "Nov", "Dec");
        var d = new Date();
        var curr_date = d.getDate();
        var curr_month = d.getMonth();
        var curr_year = d.getFullYear();
        var curr_day = d.getDay();
        var curr_hour = d.getHours();
        var curr_min = d.getMinutes();
        if (curr_min < 10) {curr_min = "0" + curr_min;}
        var suffix = "am";
        if (curr_hour >= 12) {suffix = "pm"; curr_hour = curr_hour - 12;}
        if (curr_hour == 0) {curr_hour = 12;}
        var dateformatted = m_names[curr_month] + " " + curr_date + " " + curr_year + ", " + curr_hour + ":" + curr_min + " " + suffix;

        var newForumComment = new ForumComment ({
            postid: post.id,
            parentid: req.params.cid,
            user: req.user.id,
            message: markdown.toHTML(sanitizer.sanitize(req.body.message)),
            datefull: new Date(),
            date: dateformatted,
        })
        newForumComment.save(function(err) {
            post.dateupdated = dateformatted;
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
        ForumComment.findById(req.params.cid).populate('user').exec(function(err, comment) {
            if (comment === null) {
                res.redirect('/error');
            } else {
                data.replyid = req.params.cid;
                data.title = post.title + " - Lacquer Tracker";
                data.postid = post.id;
                data.posttitle = post.title;
                data.postuser = post.user;
                data.postmessage = post.message;
                data.postdate = post.date;
                data.postforum = post.forum;
                data.comment = comment;
                res.render('forumspostreply.ejs', data);
            }
        })
    })
});


//edit forum post
app.get('/forums/:forum/:id/edit', function(req, res) {
    data = {};
    ForumPost.findById(req.params.id).exec(function (err, post) {
        if (post === null) {
            res.redirect('/error');
        } else {
            data.title = post.title + " - Lacquer Tracker";
            data.postid = post.id;
            data.posttitle = post.title;
            data.postmessage = post.message;
            data.postforum = post.forum;
            res.render('forumspostedit.ejs', data);
        }
    })
});

app.post('/forums/:forum/:id/edit', isLoggedIn, function(req, res) {
    var m_names = new Array("Jan", "Feb", "Mar", "Apr", "May", "June", "July", "Aug", "Sep", "Oct", "Nov", "Dec");
        var d = new Date();
        var curr_date = d.getDate();
        var curr_month = d.getMonth();
        var curr_year = d.getFullYear();
        var curr_day = d.getDay();
        var curr_hour = d.getHours();
        var curr_min = d.getMinutes();
        if (curr_min < 10) {curr_min = "0" + curr_min;}
        var suffix = "am";
        if (curr_hour >= 12) {suffix = "pm"; curr_hour = curr_hour - 12;}
        if (curr_hour == 0) {curr_hour = 12;}
        var dateformatted = m_names[curr_month] + " " + curr_date + " " + curr_year + ", " + curr_hour + ":" + curr_min + " " + suffix;

    ForumPost.findById(req.params.id, function (err, post){
        post.forum = req.body.forum;
        post.title = sanitizer.sanitize(req.body.posttitle);
        post.message = sanitizer.sanitize(req.body.postmessage);
        post.dateupdated = dateformatted;
        post.save();
        res.redirect('/forums/' + post.forum + '/' + post.id)
    })
});



app.get('/forums/:forum/:id/add', isLoggedIn, function(req, res) {
    res.redirect('/forums/' + req.params.forum + '/' + req.params.id + "#addcomment")
});


app.get('/forums/:forum/:id/:cid/remove', isLoggedIn, function(req, res) {
    ForumComment.findById(req.params.cid, function(err, comment) {
        if (comment.childid.length > 0) {
            comment.message = markdown.toHTML("_deleted_");
            comment.save(function(err) {
                res.redirect("/forums/" + req.params.forum + "/" + req.params.id);
            })
        } else {
            ForumPost.findById(req.params.id).remove({comments: req.params.cid});
                ForumComment.findByIdAndRemove(req.params.cid, function(err) {
                res.redirect("/forums/" + req.params.forum + "/" + req.params.id);
            })
        }
    })
});


app.get('/forums/:forum/:id/remove', isLoggedIn, function(req, res) {
    ForumPost.findByIdAndRemove(req.params.id, function(err) {
        ForumComment.find({parentid : req.params.id}).remove();
        res.redirect('/forums/' + req.params.forum);
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