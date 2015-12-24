'use strict';

var mongoose = require('mongoose'),
    transactionManager = require('transaction-manager'),
    Promise = require('bluebird');

/*
    node.js domains break with promise.js library
    Sol: override then function and bind callback of then function to active domain
 */
var originalThen = Promise.prototype.then;
Promise.prototype.then = function (cb, eb) {
    if(process.domain) {
        if (typeof cb === 'function') {
            // bind eb to the current domain
            cb = process.domain.bind(cb);
        }
        if (typeof eb === 'function') {
            // bind eb to the current domain
            eb = process.domain.bind(eb);
        }
    }
    return originalThen.call(this, cb, eb);
};

var queryMapper = {
    'update': 'UPDATE',
    'findAndModify': 'UPDATE',
    'findOneAndUpdate': 'UPDATE',
    'findByIdAndUpdate': 'UPDATE',
    'remove': 'REMOVE',
    'findOneAndRemove': 'REMOVE',
    'findByIdAndRemove': 'REMOVE'
};
/*
    exec function is called for all the query type update and remove operations
 */

var exec = mongoose.Query.prototype.exec;                                                   //store reference to original mongoose query exec function
mongoose.Query.prototype.exec = function (op, callback) {
    var self, model, query, operation;

    self = this;
    model = self.model;
    query = self._conditions;
    operation = queryMapper[self.op];                                                       //self.op = operation type, eg: 'remove', 'update'

    if (!operation)  {                          //If write operation is not mapped in queryMapper
        if(self._update) console.log('This method ' + self.op + ' : does not support transactions');
        return  exec.call(self, op, callback);
    }

    return transactionManager.enqueue(transactionManager.COMMANDS[operation], {
        'query': query,
        'model': model
    }).then(function () {
        return exec.call(self, op, callback);
    });
};

exports.registerHooks = function (BaseSchema) {
    BaseSchema.pre('save', function (next) {                                                  //For documents which exists in mongo
        if (this._doc && this._doc.__v) {                                                     //In create document, _v is undefined
            transactionManager.enqueue(transactionManager.COMMANDS.UPDATE, {
                'id': this._doc._id,
                'model': mongoose.model(this.constructor.modelName)
            }).then(next);
        }
        else {
            next();
        }
    });

    BaseSchema.post('save', function (doc) {                                                    //Newly created document is only available here
        if (doc._doc && doc._doc.__v === 0) {                                                   //In create document, _v is 0
            transactionManager.enqueue(transactionManager.COMMANDS.CREATE, {'document': doc});
        }
    });

    BaseSchema.post('remove', function (doc) {                                                   //For remove document
        transactionManager.enqueue(transactionManager.COMMANDS.REMOVE, {'document': doc});
    });
};
