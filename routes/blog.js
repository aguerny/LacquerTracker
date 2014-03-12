var Polish = require('../app/models/polish');
var User = require('../app/models/user');
var Review = require('../app/models/review');
var Photo = require('../app/models/photo');
var UserPhoto = require('../app/models/userphoto');
var Blog = require('../app/models/blog');
var BlogComment = require('../app/models/blogcomment');
var ForumPost = require('../app/models/forumpost');
var ForumComment = require('../app/models/forumcomment');
var mongoose = require('mongoose');
var fs = require('fs');
var path = require('path');
var nodemailer = require('nodemailer');
var sanitizer = require('sanitizer');
var markdown = require('markdown').markdown;
var _ = require('lodash');


module.exports = function(app, passport) {


//main blog page
app.get('/blog', function(req, res) {
    data = {}
    data.title = 'Blog - Lacquer Tracker';
    Blog.find({}).sort({datefull: -1}).populate('user').exec(function(err, posts) {
        data.blogposts = posts;
        res.render('blog.ejs', data);
    })
});




//add blog entry
app.get('/blog/add', isLoggedIn, function(req, res) {
    if (req.user.username === "t" || req.user.username === "alli") {
        res.render('blogadd.ejs', {title: 'Add a Blog Entry - Lacquer Tracker'});
    } else {
        res.redirect('/error');
    }
});


app.post('/blog/add', function(req, res) {
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
        message: markdown.toHTML(sanitizer.sanitize(req.body.postmessage)),
        datefull: new Date(),
        date: dateformatted,
    });
    newBlog.save(function(err) {
        if (err) throw err;
else res.redirect('/blog');
    })
});




//view specific blog post
app.get('/blog/:title', function(req, res) {
    data = {};
    Blog.findOne({title: req.params.title.replace(/_/g," ")}).populate('comments').populate('user').exec(function (err, blog) {
        if (blog === null) {
            res.redirect('/error');
        } else {
            data.title = blog.title + " - Lacquer Tracker";
            data.posttitle = blog.title;
            data.postuser = blog.user;
            data.postmessage = blog.message;
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



app.post('/blog/:title/add', isLoggedIn, function(req, res) {
    var thistitle = req.params.title.replace(/_/g," ")
    Blog.findOne({title: thistitle}, function (err, blog){
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
            parentid: blog.id,
            user: req.user.id,
            message: markdown.toHTML(sanitizer.sanitize(req.body.message)),
            datefull: new Date(),
            date: dateformatted,
        })
        newBlogComment.save(function(err) {
            blog.comments.push(newBlogComment.id);
            blog.save(function(err) {
                res.redirect('/blog/' + blog.title)
            })
        })
        })
});



//remove blog post comment
app.get('/blog/:title/:id/remove', isLoggedIn, function(req, res) {
    Blog.find({title: req.params.title}).remove({comments: req.params.id});
    BlogComment.findByIdAndRemove(req.params.id, function(err) {
        res.redirect("/blog/" + req.params.title);
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