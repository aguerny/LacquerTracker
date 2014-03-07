//load the things we need
var mongoose = require('mongoose');


//define the schema for our blog post model
var forumpostSchema = mongoose.Schema({
	user: {type: mongoose.Schema.Types.ObjectId, ref: 'User'},
	title: String,
	message: String,
	datefull: Date,
	date: String,
	dateupdated: String,
	forum: String,
	comments: [{type: mongoose.Schema.Types.ObjectId, ref: 'ForumComment'}],
});


//create the model for users and expose it to our app
module.exports = mongoose.model('ForumPost', forumpostSchema);