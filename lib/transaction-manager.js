'use strict';

var transactions = require('./transactions'),
    BlueBird = require('bluebird'),
    domain = require('domain');
/**
 * Checks if transaction is enable
 * @returns {boolean}
 * @private
 */
function _isTransactionEnable() {
    return process.domain ? true : false;
}

/**
 * Attempts rollback in case of error
 *
 * @api public
 */
exports.enableTransaction = function(req, res, next) {
    var reqDomain = domain.create();
    reqDomain.run(next);
};

/**
 * Attempts enqueue in rollback logs
 * @param {String} operation ex: transactionManager.COMMANDS.UPDATE
 * @param {Object} options  ex: {document:{}} OR {model:{},docId:""} OR {model:{},query:""}
 *
 * @api public
 */
exports.enqueue = function(operation, options) {
    if(!_isTransactionEnable()) return BlueBird.resolve();

    return transactions.doEnqueue(operation, options);
};

/**
 * Attempts rollback in case of error
 *
 * @api public
 */
exports.rollback = function() {
    if(_isTransactionEnable()) {
        transactions.doRollback()
        .then(null, function(err) {
            console.log('Rollback Catastrophe :-  ' + err + '\n' + transactions.getRollbackModelNames());
        })
        .finally(transactions.doCleanUp);
    }
};

/**
 * Attempts cleanup of rollback logs
 *
 * @api public
 */
exports.cleanUp = function() {
    if(_isTransactionEnable())transactions.doCleanUp();
};

