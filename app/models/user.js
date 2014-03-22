//load the things we need
var mongoose = require('mongoose');
var bcrypt = require('bcrypt-nodejs');

//define the schema for our user model
var userSchema = mongoose.Schema({
	username     : {type: String, lowercase: true},
	password     : String,
	email		 : String,
	about		 : String,
	ownedpolish  : [{type: mongoose.Schema.Types.ObjectId, ref: 'Polish'}],
	wantedpolish : [{type: mongoose.Schema.Types.ObjectId, ref: 'Polish'}],
	photos       : [{type: mongoose.Schema.Types.ObjectId, ref: 'UserPhoto'}],
	profilephoto : String,
	isvalidated  : Boolean,
	level        : String,
	notifications: String,
});


//methods =========================
//generating a hash
userSchema.methods.generateHash = function(password) {
	return bcrypt.hashSync(password, bcrypt.genSaltSync(8), null);
};

//checking if password is valid
userSchema.methods.validPassword = function(password) {
	return bcrypt.compareSync(password, this.password);
};

//create the model for users and expose it to our app
module.exports = mongoose.model('User', userSchema);