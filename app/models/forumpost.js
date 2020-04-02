//load the things we need
var mongoose = require('mongoose');


//define the schema for our model
var forumpostSchema = mongoose.Schema({
	user: {type: mongoose.Schema.Types.ObjectId, ref: 'User'},
	title: String,
	message: String,
    photo: String,
	date: Date,
    dateupdated: Date,
	forum: String,
	comments: [{type: mongoose.Schema.Types.ObjectId, ref: 'ForumComment'}],
});


//create the model for users and expose it to our app
module.exports = mongoose.model('ForumPost', forumpostSchema);