//load the things we need
var mongoose = require('mongoose');


//define the schema for our user model
var brandSchema = mongoose.Schema({
    name: String,
    website: String,
    bio: String,
    photo: String,
    official: Boolean,
    alternatenames: [String],
    indie: Boolean,
});


//create the model for users and expose it to our app
module.exports = mongoose.model('Brand', brandSchema);