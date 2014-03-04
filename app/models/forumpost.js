//load the things we need
var mongoose = require('mongoose');


//define the schema for our blog post model
var forumpostSchema = mongoose.Schema({
	userid: String,
	username: String,
	title: String,
	message: String,
	datefull: Date,
	date: String,
	forum: String,
});


//create the model for users and expose it to our app
module.exports = mongoose.model('ForumPost', forumpostSchema);