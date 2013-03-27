var error = require('./error');
var Backend = require('./backend/backend').Backend;


FolderProvider = function(redisClient) {
  this.rclient = redisClient;
};


FolderProvider.prototype.folders = {};

FolderProvider.prototype.findAll = function(next) {

  var provider = this;
  provider.rclient.smembers("folderIds", function(error, uids)  {
    if (error) { return next(error); }
    var r = [];
    var count = uids.length;
    if (count === 0) {
      next (null, r);
    }
    uids.forEach(function(uid) {
      provider.findById(uid, function(error, folder) {
        if (error) { return next(error); }
        r.push(folder);
        if (--count === 0) {
          next(null, r);
        }
      });
    });
  });
};

FolderProvider.prototype.findById = function(id, next) {
  this.rclient.get("folderId:" + id + ":device", function(error, data) {
    if (error) { return next(error); }
    if (!data) { return next(); }
    next(null, new Backend(JSON.parse(data)));
  });
};

FolderProvider.prototype.createNew = function(name,pub,next) {

  var provider = this;
  var newFolder = new Backend(name);
  newFolder.create(function(error) {
    if (!error) {
      newFolder.pub = pub;
      newFolder.getId(function (error, id, forBackend) {
        if (!error && id) {
          provider.rclient.set("folderId:" + id + ":folder", JSON.stringify(newFolder));
          provider.rclient.sadd("folderIds:" + id);
          next(null, newFolder);
        } else {
          console.log('could not add folder; no id returned, not saved: ' + error);
          next(new Error('Folder creation failed'));
        }
      });
    } else {
      next(new Error('Foldername already in use'));
    }
  });
};


exports.FolderProvider = FolderProvider;
