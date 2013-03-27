var GitBackend = require('./git').GitBackend;
var Dazzle = require('./dazzle');

Backend = function(name,data){
  this.type = 'git';
  this.name = name;
  this.path = null;
  this.pub = null;

  this.backend = null;

  if(data) {
    this.name = data.name;
    this.path = data.path;
    this.pub = data.pub;
    this.backend = data.backend
  }
};

Backend.prototype = {
  create: function(next) {
    var b = this;
    Dazzle.create(this.name, function(error,path) {
      b.path = path;
      b.backend = new GitBackend(path);
      next(error);
    });
  },

  getRawData: function(req, ondata, next) {
    this.backend.getRawData(req, ondata, next);
  },

  createArchive: function(req, ondata, next) {
    this.backend.createArchive(req, ondata, next);
  },

  getItems: function(req, next) {
    this.backend.getItems(req, next);
  },

  getRecentChanges: function(req, next) {
    this.backend.getRecentChanges(req, next);
  },

  getCurrentRevision: function(req, next) {
    this.backend.getCurrentRevision(req, next);
  },

  getAllItemCount: function(req, next) {
    this.backend.getAllItemCount(req, next);
  },

  getFolderItemCount: function(req, next) {
    this.backend.getFolderItemCount(req, next);
  }
};

exports.Backend = Backend;
