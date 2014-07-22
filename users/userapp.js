var UserApp = require("userapp");
var Local = require('./local').LocalUserProvider;

UAUserProvider = function (options) {
  UserApp.initialize({
    appId: options.appId
  });
  this.local = new Local(options);
};

UAUserProvider.prototype = {
  createNew: function (login, name, password, admin, acl, next) {
    var local = this.local;

    local.findByLogin(login, function (error, user) {
      if (!user) {
        UserApp.User.save({
          "first_name": name,
          "email": login,
          "password": password,
        }, function (error, result) {
          if (error) {
            next(new Error(error.message));
          } else {
            local.createNew(login, name, password, admin, acl, next);
          }
        });
      } else {
        next(new Error('Login already used'));
      }
    });
  },

  updateUser: function (user, next) {

    UserApp.User.save({
      "first_name": user.name,
    }, function (error, result) {
      if (error) {
        next(error);
      } else {
        next(null, new User(result));
      }
    });
  },

  deleteUser: function (uid, next) {

    UserApp.User.remove({
      "user_id": uid
    }, function (error, result) {
      if (error) {
        next(error);
      } else {
        next();
      }
    });
  },

  findByUid: function (uid, next) {
    this.local.findByUid(uid, next);
  },

  findByLogin: function (login, next) {
    this.local.findByLogin(login, next);
  },

  getUserCount: function (next) {
    this.local.getUserCount(next);
  },

  findAll: function (next) {
    this.local.findAll(next);
  },

  serializeUser: function (user, next) {
    next(null, user.login);
  },

  deserializeUser: function (login, next) {
    this.local.findByLogin(login, function (err, user) {
      next(err, user);
    });
  }
}

exports.UAUserProvider = UAUserProvider;