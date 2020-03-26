//load the things we need
var mongoose = require('mongoose');


//define the schema for our model
var photoSchema = mongoose.Schema({
	polishid: String,
	userid: {type: mongoose.Schema.Types.ObjectId, ref: 'User'},
    location: String,
    creditname: String,
    creditlink: String,
    pendingdelete: Boolean,
    pendingreason: String,
});


//create the model for users and expose it to our app
module.exports = mongoose.model('Photo', photoSchema);