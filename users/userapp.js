var UserApp = require("userapp")
var Local = require('./local').LocalUserProvider
var Strategy = require('passport-userapp').Strategy

UAUserProvider = function (options) {
  UserApp.initialize(options);

  var local = this.local = new Local(options)
  this.strategy = new Strategy(options, function (user, next) {
    process.nextTick(function () {
      if (user.email) {
        // Found on UserApp.io
        local.findByLogin(user.email, function (error, profile) {
          if (!profile) {
            return next(new Error('Invalid login'))
          }
          profile.token = user.token
          return next(null, profile)
        })
      } else {
        // Already authenticated
        return next(null, user)
      }
    })
  })
}

UAUserProvider.prototype = {
  createNew: function (login, name, password, admin, acl, next) {
    var local = this.local;

    local.findByLogin(login, function (error, user) {
      if (!user) {
        UserApp.User.count({
          filters :[{
            query: "login:" + login
          }]
        }, function (error, result) {
          if (error) {
            next(new Error(error.message));
          } else if(result.count) {
            local.createNew(login, name, password, admin, acl, next);
          } else {
            next(new Error('User does not exist'));
          }
        });
      } else {
        next(new Error('Login already used'));
      }
    });
  },

  updateUser: function (user, next) {
    this.local.deleteUser(uid, next);
  },

  deleteUser: function (uid, next) {
    this.local.deleteUser(uid, next);
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

exports.UserProvider = UAUserProvider;