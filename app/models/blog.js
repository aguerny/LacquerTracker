//load the things we need
var mongoose = require('mongoose');


//define the schema for our blog post model
var blogSchema = mongoose.Schema({
	userid: String,
	username: String,
	title: String,
	message: String,
	date: Date,
	dateformatted: String,
	comments: [],
});


//create the model for users and expose it to our app
module.exports = mongoose.model('Blog', blogSchema);