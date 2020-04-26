//load the things we need
var mongoose = require('mongoose');


//define the schema for our model
var brandSchema = mongoose.Schema({
    name: String,
    bio: String,
    photo: String,
    official: Boolean,
    polishlock: Boolean,
    alternatenames: [String],
    indie: Boolean,
    polish: [{type: mongoose.Schema.Types.ObjectId, ref: 'Polish'}],
});


//create the model for users and expose it to our app
module.exports = mongoose.model('Brand', brandSchema);