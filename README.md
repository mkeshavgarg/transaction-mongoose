# transaction-mongoose

Simple transaction system in mongoose to provide atomicity for multi collection updates.

### Features:
* Enable Transaction – Only enable transaction if necessary.
* Enqueue – Invoked for any write operation that occurs while serving a request. This involves storing the initial version
            of entity before changes are made while processing of request.
* Rollback – Invoked in case of error. It restores all the documents to their original state at the start of request.
* Cleanup - At the end, cleans up the rollback logs for that request.

### How to use it ?
I have created a sample interface to help you quick start with this library. You can visit this at
interface/transaction.support.js. It is a sample of transaction layer which will sit before mongoose and listen to all the queries. 
In this way you will not have to change your existing request handlers to work with this library and this file will ensure registration of all CRUD queries.
Now, if error occurs at any stage while serving request, call rollback function to restore all documents to their original state.

### Bugs and Issues
Have a bug or an issue with this? [Open a new Issue](https://github.com/mkeshavgarg/transaction-mongoose/issues)

### Pull request
This library is constructed with node js domains as of now, that will be removed from node js in the future releases. But those who are using current versions of node js, can use this to provide easy transaction support in mongoose. You can also pull request with some other alternative at the top
of this.



