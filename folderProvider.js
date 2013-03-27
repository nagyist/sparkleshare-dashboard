var error = require('./error');
var Backend = require('./backend/backend').Backend;


FolderProvider = function(redisClient) {
  this.rclient = redisClient;
};


FolderProvider.prototype.folders = {};

FolderProvider.prototype.findAll = function(next) {

  var provider = this;
  provider.rclient.smembers("folderNames", function(error, uids)  {
    if (error) { return next(error); }
    var r = [];
    var count = uids.length;
    if (count === 0) {
      next (null, r);
    }
    uids.forEach(function(uid) {
      provider.findByName(uid, function(error, folder) {
        if (error) { return next(error); }
        r.push(folder);
        if (--count === 0) {
          next(null, r);
        }
      });
    });
  });
};

FolderProvider.prototype.findByName = function(name, next) {
  this.rclient.get("folderName:" + name + ":folder", function(error, data) {
    if (error) { return next(error); }
    if (!data) { return next(); }
    next(null, new Backend(null,JSON.parse(data)));
  });
};

FolderProvider.prototype.createNew = function(name,pub,next) {

  var provider = this;
  var newFolder = new Backend(name);
  newFolder.create(function(error) {
    if (!error) {
      newFolder.pub = pub;
      provider.rclient.set("folderName:" + name + ":folder", JSON.stringify(newFolder));
      provider.rclient.sadd("folderNames", name);
      next(null, newFolder);
    } else {
      next(new Error('Creation of Folder failed. Foldername already in use?'));
    }
  });
};


exports.FolderProvider = FolderProvider;
