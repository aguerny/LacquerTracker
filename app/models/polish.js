//load the things we need
var mongoose = require('mongoose');


//define the schema for our user model
var polishSchema = mongoose.Schema({
	batch: String,
    brand: String,
    name: String,
    color: String,
    type: String,
    indie: String,
    code: String,
});


//create the model for users and expose it to our app
module.exports = mongoose.model('Polish', polishSchema);