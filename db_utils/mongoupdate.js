//set up
var mongo = require('mongodb').MongoClient;
var myFunction = function (err, result) {console.log(result);}

var connection = mongo.connect('mongodb://localhost:27017/lacquertracker', function (err, db) {
    var search = db.collection('brands');
    search.find().toArray(function(err, docs) {
        for (var i = 0; i < docs.length; i++) {
            var currentDoc = docs[i];
            search.update({_id: currentDoc._id}, {$set: {alternatenames: [currentDoc.name.toLowerCase()]}}, myFunction);
        }
    })
}); // connect to database