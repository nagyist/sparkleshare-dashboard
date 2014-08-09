UserProvider = function (options, redisClient, deviceProvider) {
  this.name = options.name
  
  var Provider = require('./' + this.name).UserProvider
  this.userProvider = new Provider(options, redisClient, deviceProvider)
  this.strategy = this.userProvider.strategy
}

UserProvider.prototype = {
  createNew: function (login, name, password, admin, acl, next) {
    this.userProvider.createNew(login, name, password, admin, acl, next)
  },
  updateUser: function (user, next) {
    this.userProvider.updateUser(user, next)
  },
  deleteUser: function (uid, next) {
    this.userProvider.deleteUser(uid, next)
  },
  findByUid: function (uid, next) {
    this.userProvider.findByUid(uid, next)
  },
  findByLogin: function (login, next) {
    this.userProvider.findByLogin(login, next)
  },
  getUserCount: function (next) {
    this.userProvider.getUserCount(next)
  },
  findAll: function (next) {
    this.userProvider.findAll(next)
  },
  serializeUser: function (user, next) {
    this.userProvider.serializeUser(user, next)
  },
  deserializeUser: function (user, next) {
    this.userProvider.deserializeUser(user, next)
  }
}

exports.UserProvider = UserProvider;