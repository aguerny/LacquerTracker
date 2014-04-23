//load the things we need
var mongoose = require('mongoose');


//define the schema for our blog post model
var blogcommentSchema = mongoose.Schema({
	blogid: String,
	parentid: String,
	user: {type: mongoose.Schema.Types.ObjectId, ref: 'User'},
	message: String,
	date: String,
	childid: [{type: mongoose.Schema.Types.ObjectId, ref: 'BlogComment'}],
});


//create the model for users and expose it to our app
module.exports = mongoose.model('BlogComment', blogcommentSchema);