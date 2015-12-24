'use strict';

var mongoose = require('mongoose'),
    BlueBird = require('bluebird'),
    COMMANDS = require('./commands');

function _addDoc(doc, operation, rollbackJson) {
    if(!rollbackJson[doc.id]) {
        rollbackJson[doc.id] = {           //key is object Id of model
            'doc': doc,
            'type': operation,
            'modelName': doc.constructor.modelName
        };
    }
}

function _enqueue(document, operation, rollbackJson) {
    if(document && document instanceof Array) {
        document.forEach(function(doc) {
            _addDoc(doc, operation, rollbackJson);      //add doc info to rollback logs
        });
    }
    else if(document){
        _addDoc(document, operation, rollbackJson);
    }
    return;
}

function _rollback(doc, type) {
    if (type === COMMANDS.CREATE) {
        return doc.remove();
    }
    else if(type === COMMANDS.UPDATE){
        var update = {$set:doc.toJSON()};
        var model = mongoose.model(doc.constructor.modelName);
        return model.findOneAndUpdate({_id: doc.id}, update);
    }
    else {                  //Case: Remove doc
        doc.save();
    }
}

function _getRollbackJson() {
    if(!process.domain.rollbackJson) process.domain.rollbackJson = {};
    return process.domain.rollbackJson;                                        //rollbackJson is stored in the context of this particular request
}

exports.doEnqueue = function (operation, options) {

    var model, docId, query, document,
    rollbackJson = _getRollbackJson();

    options.document && (document = options.document),
    options.model && (model = options.model),
    options.id && (docId = options.id),
    options.query && (query = options.query);

    if (document) {
        return _enqueue(document, operation, rollbackJson);
    }
    else if (docId && model) {                                              //Fetch fresh documents if only docId is given
        return model.findById(docId).exec().then(function (document) {
            return _enqueue(document, operation, rollbackJson);
        });
    }
    else if (query && model) {                                              //Fetch fresh documents if query is given
        return model.find(query).exec().then(function (document) {
            return _enqueue(document, operation, rollbackJson);
        });
    }
};

exports.doRollback = function () {

    var rollbackJson = _getRollbackJson();

    if (!Object.keys(rollbackJson)) return BlueBird.resolve();

    var type, doc, promiseArray = [];

    for (var key in rollbackJson) {
        doc = rollbackJson[key].doc;
        type = rollbackJson[key].type;
        promiseArray.push(_rollback(doc, type));
    }
    return BlueBird.all(promiseArray);
};

exports.getRollbackModelNames = function() {
    var modelNames = [];
    var rollbackJson = _getRollbackJson();
    if(!rollbackJson) return;
    for(var key in rollbackJson) {
        modelNames.push(JSON.stringify({'name' : rollbackJson[key].modelName, '_id': key}));
    }

    return modelNames.join("\n");
};

exports.doCleanUp = function () {
    return process.domain.exit();
    //return process.domain.rollbackJson = null;
};
