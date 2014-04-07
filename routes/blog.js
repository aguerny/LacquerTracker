var User = require('../app/models/user');
var Blog = require('../app/models/blog');
var BlogComment = require('../app/models/blogcomment');
var sanitizer = require('sanitizer');
var markdown = require('markdown-css');
var nodemailer = require('nodemailer');


module.exports = function(app, passport) {


//main blog page
app.get('/blog', function(req, res) {
    data = {}
    data.title = 'Blog - Lacquer Tracker';
    Blog.find({}).sort({datefull: -1}).populate('user').exec(function(err, posts) {
        var allposts = posts.map(function(x) {
            x.message = markdown(x.message);
            return x;
        })
        data.blogposts = allposts;
        res.render('blog.ejs', data);
    })
});




//add blog entry
app.get('/blog/add', isLoggedIn, function(req, res) {
    if (req.user.level === "admin") {
        res.render('blogadd.ejs', {title: 'Add a Blog Entry - Lacquer Tracker'});
    } else {
        res.redirect('/error');
    }
});


app.post('/blog/add', isLoggedIn, function(req, res) {
    if (req.user.level === "admin") {
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

        var newBlog = new Blog ({
            user: req.user.id,
            title: sanitizer.sanitize(req.body.posttitle),
            message: sanitizer.sanitize(req.body.postmessage),
            datefull: new Date(),
            date: dateformatted,
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
        if (blog === null) {
            res.redirect('/error');
        } else {
            data.title = blog.title + " - Lacquer Tracker";
            data.postid = blog.id;
            data.posttitle = blog.title;
            data.postuser = blog.user;
            data.postmessage = markdown(blog.message);
            data.postdate = blog.date;
            User.populate(blog, {path:'comments.user'}, function(err) {
                data.postcomments = blog.comments;
                res.render('blogview.ejs', data);
            })
        }
    })
});




//add comment to blog post
app.get('/blog/:title/add', isLoggedIn, function(req, res) {
    res.redirect('/blog/' + req.params.title.replace(/_/g," ") + "#addcomment")
});



app.post('/blog/:title/:id/add', isLoggedIn, function(req, res) {
    var thistitle = req.params.title.replace(/_/g," ")
    Blog.findOne({title: thistitle}).populate('user').exec(function (err, blog){
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

        var newBlogComment = new BlogComment ({
            blogid: blog.id,
            parentid: req.params.id,
            user: req.user.id,
            message: markdown(sanitizer.sanitize(req.body.message)),
            datefull: new Date(),
            date: dateformatted,
        })
        newBlogComment.save(function(err) {

            if (req.user.username !== blog.user.username && blog.user.notifications === "on") {
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
                    to: blog.user.email,
                    //replace it with id you want to send multiple must be separated by ,(comma)
                    subject: 'New reply to your blog post',
                    text: "Hey " + blog.user.username + ",\n\n" + req.user.username + " just replied to your blog post: " + blog.title + "\n\nCome check it out here: http://www.lacquertracker.com/blog/" + blog.title.replace(/ /g,"_") + "\n\n\nThanks,\nLacquer Tracker",
                };

                //send Email
                smtpConfig.sendMail(mailOpts, function(err, result) {
                    if (err) {throw err};
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
});



//reply to blog post comment
app.get('/blog/:title/:id/add', isLoggedIn, function(req, res) {
    data = {};
    Blog.findOne({title: req.params.title.replace(/_/g," ")}).populate('user').exec(function (err, blog) {
        BlogComment.findById(req.params.id).populate('user').exec(function(err, comment) {
            if (comment === null) {
                res.redirect('/error');
            } else {
                data.replyid = req.params.id;
                data.title = blog.title + " - Lacquer Tracker";
                data.posttitle = blog.title;
                data.postuser = blog.user;
                data.postmessage = markdown(blog.message);
                data.postdate = blog.date;
                data.comment = comment;
                res.render('blogviewreply.ejs', data);
            }
        })
    })
});



//remove blog post comment
app.get('/blog/:title/:id/remove', isLoggedIn, function(req, res) {
    BlogComment.findById(req.params.id, function(err, comment) {
        if (comment.user == req.user.id || req.user.level === "admin") {
            if (comment.childid.length > 0) {
                comment.message = "<i>deleted</i>";
                comment.save(function(err) {
                    res.redirect("/blog/" + req.params.title);
                })
            } else {
                Blog.find({title: req.params.title}).remove({comments: req.params.id});
                    BlogComment.findByIdAndRemove(req.params.id, function(err) {
                    res.redirect("/blog/" + req.params.title);
                })
            }
        } else {
            res.redirect('/error');
        }
    })
});


//remove blog post comment - admin only
app.get('/blog/:title/:id/removepermanent', isLoggedIn, function(req, res) {
    if (req.user.level === "admin") {
        BlogComment.findById(req.params.id, function(err, comment) {
            Blog.find({title: req.params.title}).remove({comments: req.params.id});
                BlogComment.findByIdAndRemove(req.params.id, function(err) {
                res.redirect("/blog/" + req.params.title);
            })
        })
    } else {
        res.redirect('/error');
    }
});



//edit blog post
app.get('/blog/:id/edit', isLoggedIn, function(req, res) {
    data = {};
    Blog.findById(req.params.id).exec(function (err, post) {
        if (post.user == req.user.id) {
            if (post === null) {
                res.redirect('/error');
            } else {
                data.title = post.title + " - Lacquer Tracker";
                data.postid = post.id;
                data.posttitle = post.title;
                data.postmessage = post.message;
                res.render('blogpostedit.ejs', data);
            }
        } else {
            res.redirect('/error');
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