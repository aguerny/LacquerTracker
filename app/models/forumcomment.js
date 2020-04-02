//load the things we need
var mongoose = require('mongoose');


//define the schema for our model
var forumcommentSchema = mongoose.Schema({
	postid: String,
	parentid: String,
	user: {type: mongoose.Schema.Types.ObjectId, ref: 'User'},
	message: String,
	date: Date,
	childid: [{type: mongoose.Schema.Types.ObjectId, ref: 'ForumComment'}],
});


//create the model for users and expose it to our app
module.exports = mongoose.model('ForumComment', forumcommentSchema);