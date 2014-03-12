//load the things we need
var mongoose = require('mongoose');


//define the schema for our blog post model
var blogcommentSchema = mongoose.Schema({
	parentid: {type: String, ref: 'Blog'},
	user: {type: mongoose.Schema.Types.ObjectId, ref: 'User'},
	message: String,
	datefull: Date,
	date: String,
	subcomments: [{type: String, ref: 'BlogComment'}]
});


//create the model for users and expose it to our app
module.exports = mongoose.model('BlogComment', blogcommentSchema);