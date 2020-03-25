//load the things we need
var mongoose = require('mongoose');


//define the schema for our blog post model
var checkincommentSchema = mongoose.Schema({
	checkinid: String,
	parentid: String,
	user: {type: mongoose.Schema.Types.ObjectId, ref: 'User'},
	message: String,
	date: Date,
	childid: [{type: mongoose.Schema.Types.ObjectId, ref: 'CheckinComment'}],
});


//create the model for users and expose it to our app
module.exports = mongoose.model('CheckinComment', checkincommentSchema);