var User = require('../app/models/user');
var Blog = require('../app/models/blog');
var BlogComment = require('../app/models/blogcomment');
var sanitizer = require('sanitizer');
var markdown = require('markdown-css');
var nodemailer = require('nodemailer');
var moment = require('moment-timezone');
var mongoose = require('mongoose');


module.exports = function(app, passport) {


//main blog page
app.get('/blog', function(req, res) {
    data = {}
    data.title = 'Blog - Lacquer Tracker';
    Blog.find({}).sort({datesort: -1}).populate('user').exec(function(err, posts) {
        var allposts = posts.map(function(x) {
            x.message = markdown(x.message);
            if (req.isAuthenticated() && req.user.timezone.length > 0) {
                x.date = moment(x.date).tz(req.user.timezone).format('MMM D YYYY, h:mm a');
            } else {
                x.date = moment(x.date).tz("America/New_York").format('MMM D YYYY, h:mm a');
            }
            return x;
        })
        data.blogposts = allposts;
        res.render('blog/blog.ejs', data);
    })
});




//add blog entry
app.get('/blog/add', isLoggedIn, function(req, res) {
    if (req.user.level === "admin") {
        res.render('blog/add.ejs', {title: 'Add a Blog Entry - Lacquer Tracker'});
    } else {
        res.redirect('/error');
    }
});


app.post('/blog/add', isLoggedIn, function(req, res) {
    if (req.user.level === "admin") {
        var newBlog = new Blog ({
            user: req.user.id,
            title: sanitizer.sanitize(req.body.posttitle),
            message: sanitizer.sanitize(req.body.postmessage),
            date: new Date(),
            datesort: new Date(),
        });
        newBlog.save(function(err) {
            if (err) throw err;
            else res.redirect('/blog');
        })
    } else {
        res.redirect('/error');
    }
});




//view specific blog post
app.get('/blog/:title', function(req, res) {
    data = {};
    Blog.findOne({title: req.params.title.replace(/_/g," ")}).populate('comments').populate('user').exec(function (err, blog) {
        if (blog === null || blog === undefined) {
            res.redirect('/error');
        } else {
            data.title = blog.title + " - Lacquer Tracker";
            data.postid = blog.id;
            data.posttitle = blog.title;
            data.postuser = blog.user;
            data.postmessage = markdown(blog.message);
            if (req.isAuthenticated() && req.user.timezone.length > 0) {
                data.postdate = moment(blog.date).tz(req.user.timezone).format('MMM D YYYY, h:mm a');
            } else {
                data.postdate = moment(blog.date).tz("America/New_York").format('MMM D YYYY, h:mm a');
            }
            User.populate(blog, {path:'comments.user'}, function(err) {
                var allcomments = blog.comments.map(function(x) {
                    if (req.isAuthenticated() && req.user.timezone.length > 0) {
                        x.date = moment(x.date).tz(req.user.timezone).format('MMM D YYYY, h:mm a');
                    } else {
                        x.date = moment(x.date).tz("America/New_York").format('MMM D YYYY, h:mm a');
                    }
                    return x;
                })
                data.postcomments = allcomments;
                res.render('blog/view.ejs', data);
            })
        }
    })
});




//add comment to blog post
app.get('/blog/:title/add', isLoggedIn, function(req, res) {
    res.redirect('/blog/' + req.params.title.replace(/_/g," ") + "#addcomment")
});

app.get('/blog/:title/addreply', isLoggedIn, function(req, res) {
    res.redirect('/blog/' + req.params.title.replace(/_/g," "))
});

app.post('/blog/:title/:id/add', isLoggedIn, function(req, res) {
    var thistitle = req.params.title.replace(/_/g," ")
    Blog.findOne({title: thistitle}).populate('user').exec(function (err, blog){
        var newBlogComment = new BlogComment ({
            blogid: blog.id,
            parentid: req.params.id,
            user: req.user.id,
            message: markdown(sanitizer.sanitize(req.body.message)),
            date: new Date(),
        })
        newBlogComment.save(function(err) {

            BlogComment.findById(req.params.id).populate('user').exec(function(err, comment) {
                if (comment !== null) {
                    if (req.user.username !== comment.user.username && comment.user.notifications === "on" && comment.user.username !== blog.user.username) {
                        //mail notification
                        var transport = nodemailer.createTransport('sendmail', {
                            path: "/usr/sbin/sendmail",
                        });

                        var mailOptions = {
                            from: "polishrobot@lacquertracker.com",
                            to: comment.user.email,
                            subject: 'New reply to your blog comment',
                            text: "Hey " + comment.user.username + ",\n\n" + req.user.username + " just replied to your comment on blog post: " + blog.title + "\n\nCome check it out here: http://www.lacquertracker.com/blog/" + blog.title.replace(/ /g,"_") + "\n\n\nThanks,\nLacquer Tracker",
                        }

                        transport.sendMail(mailOptions, function(error, response) {
                            transport.close();
                        });
                    }
                }

                if (req.user.username !== blog.user.username && blog.user.notifications === "on") {
                    //mail notification
                    var transport = nodemailer.createTransport('sendmail', {
                        path: "/usr/sbin/sendmail",
                    });

                    var mailOptions = {
                        from: "polishrobot@lacquertracker.com",
                        to: blog.user.email,
                        subject: 'New reply to your blog post',
                        text: "Hey " + blog.user.username + ",\n\n" + req.user.username + " just replied to your blog post: " + blog.title + "\n\nCome check it out here: http://www.lacquertracker.com/blog/" + blog.title.replace(/ /g,"_") + "\n\n\nThanks,\nLacquer Tracker",
                    }

                    transport.sendMail(mailOptions, function(error, response) {
                        transport.close();
                    });
                }

                blog.comments.push(newBlogComment.id);
                BlogComment.findById(req.params.id, function(err, parent) {
                    if (parent) {
                        parent.childid.push(newBlogComment.id);
                        blog.save(function(err) {
                            parent.save(function(err) {
                                res.redirect('/blog/' + blog.title)
                            })
                        })
                    } else {
                        blog.save(function(err) {
                            res.redirect('/blog/' + blog.title)
                        })
                    }
                })
            })
        })
    })
});


//remove blog post comment
app.get('/blog/:id/:cid/remove', isLoggedIn, function(req, res) {
    Blog.findById(req.params.id, function(err, blog) {
        BlogComment.findById(req.params.cid, function(err, comment) {
            if (comment === undefined || comment === null) {
                res.redirect('/error');
            } else {
                if (comment.user == req.user.id || req.user.level === "admin") {
                    if (comment.childid.length > 0) {
                        comment.message = sanitizer.sanitize(markdown("_deleted_"));
                        comment.save(function(err) {
                            res.redirect("/blog/" + blog.title.replace(/ /g,"_"));
                        })
                    } else {
                        blog.comments.remove(req.params.cid);
                        blog.save(function(err) {
                            if (comment.parentid !== comment.blogid) {
                                BlogComment.findById(comment.parentid, function(err, parentcomment) {
                                    parentcomment.childid.remove(req.params.cid);
                                    parentcomment.save();
                                    BlogComment.findByIdAndRemove(req.params.cid, function(err) {
                                        res.redirect("/blog/" + blog.title.replace(/ /g,"_"));
                                    })
                                })
                            } else {
                                BlogComment.findByIdAndRemove(req.params.cid, function(err) {
                                    res.redirect("/blog/" + blog.title.replace(/ /g,"_"));
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


//remove blog post comment - admin only
app.get('/blog/:id/:cid/removepermanent', isLoggedIn, function(req, res) {
    if (req.user.level === "admin") {
        Blog.findById(req.params.id, function(err, blog) {
            BlogComment.findById(req.params.cid, function(err, comment) {
                if (comment === undefined || comment === null) {
                    res.redirect('/error');
                } else {
                    blog.comments.remove(req.params.cid);
                    blog.save(function(err) {
                        if (comment.parentid !== comment.blogid) {
                            BlogComment.findById(comment.parentid, function(err, parentcomment) {
                                parentcomment.childid.remove(req.params.cid);
                                parentcomment.save();
                                BlogComment.findByIdAndRemove(req.params.cid, function(err) {
                                    res.redirect("/blog/" + blog.title.replace(/ /g,"_"));
                                })
                            })
                        } else {
                            BlogComment.findByIdAndRemove(req.params.cid, function(err) {
                                res.redirect("/blog/" + blog.title.replace(/ /g,"_"));
                            })
                        }
                    })
                }
            })
        })
    } else {
        res.redirect('/error');
    }
});


//remove blog post
app.get('/blog/:id/remove', isLoggedIn, function(req, res) {
    Blog.findById(req.params.id, function(err, post) {
        if (post === null || post === undefined) {
            res.redirect('/error');
        } else {
            if (post.user == req.user.id || req.user.level === "admin") {
                BlogComment.find({blogid:req.params.id}, function(err, comments) {
                    for (i=0; i < comments.length; i++) {
                        comments[i].remove();
                    }
                    Blog.findByIdAndRemove(req.params.id, function(err) {
                        res.redirect('/blog');
                    })
                })
            } else {
                res.redirect('/error');
            }
        }
    })   
});



//edit blog post
app.get('/blog/:id/edit', isLoggedIn, function(req, res) {
    data = {};
    Blog.findById(req.params.id).exec(function (err, post) {
        if (post === null || post === undefined) {
                res.redirect('/error');
        } else {
            if (post.user == req.user.id) {
                data.title = post.title + " - Lacquer Tracker";
                data.postid = post.id;
                data.posttitle = post.title;
                data.postmessage = post.message;
                res.render('blog/edit.ejs', data);
            } else {
                res.redirect('/error');
            }
        }       
    })
});

app.post('/blog/:id/edit', isLoggedIn, function(req, res) {
    Blog.findById(req.params.id, function (err, post){
        if (post.user == req.user.id) {
            post.title = sanitizer.sanitize(req.body.posttitle);
            post.message = sanitizer.sanitize(req.body.postmessage);
            post.save();
            res.redirect('/blog/' + post.title.replace(/ /g,"_"));
        } else {
            res.redirect('/error');
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