/* vim: set tabstop=2 shiftwidth=2 expandtab: */

/**
 * Module dependencies.
 */
var express = require('express');
var session = require('express-session');
var flash = require('connect-flash');
var logger = require('morgan');

var querystring = require('querystring');
var i18n = require("i18n");

var config = require('./config');
var errors = require('./error');
var utils = require('./utils');
var pathlib = require('path');

var RedisStore = require('connect-redis')(session);
var redis = require('redis'),
  redisClient = redis.createClient();
var session = session({
  secret: config.sessionSecret,
  store: new RedisStore()
});

var sass = require('node-sass')

var app = null;
if (config.https.enabled) {
  var fs = require("fs");
  var https = require("https");

  var privateKey = fs.readFileSync(config.https.key).toString();
  var certificate = fs.readFileSync(config.https.cert).toString();
  var options = {
    key: privateKey,
    cert: certificate
  }
  app = express()
  var server = https.createServer(options, app).listen(config.listen.port, function () {
    console.log("Express server listening on port " + config.listen.port);
  });
} else {
  http = require('http')
  app = express()
  var server = http.createServer(app).listen(app.get('port'), function () {
    console.log("Express server listening on port " + config.listen.port);
  });
}

i18n.configure({
  locales: ['en', 'cs', 'de', 'el']
});


// Configuration
var lf = utils.getLoggingFormat();
if (lf) {
  app.use(logger(lf));
}
app.set('views', __dirname + '/views');
app.set('view engine', 'jade');
app.set('basepath', config.basepath);
app.use(function (req, res, next) {
  if ('x-forwarded-proto' in req.headers && req.headers['x-forwarded-proto'] == 'https') {
    req.connection.encrypted = true;
  }
  next();
});

var bodyParser = require('body-parser');
var cookieParser = require('cookie-parser');
var methodOverride = require('method-override');

app.use(bodyParser.urlencoded({
  extended: true
}));
app.use(bodyParser.json());
app.use(methodOverride());
app.use(cookieParser());
app.use(flash());
app.use(sass.middleware({
    src: __dirname,
    dest: pathlib.join(__dirname, 'public'),
    debug: false
}));
app.use(express.static(__dirname + '/public'));
app.use(i18n.init);
app.use(session);

app.use(function (req, res, next) {
  res.locals.session = req.session;
  res.locals.user = req.session.user;
  res.locals.basepath = app.get('basepath');
  res.locals.convertSize = function (bytes) {
    var unit = 0;
    while (unit < 3 && bytes >= 1024) {
      unit++;
      bytes /= 1024;
    };
    return (Math.round(bytes * 100, 2) / 100).toString() + " " + ["", "Ki", "Mi", "Gi"][unit] + "B";
  }
  res.locals.__i = i18n.__;
  res.locals.__n = i18n.__n;
  res.locals.flash = req.flash;
  next();
});

var FolderProvider = require('./folderProvider').FolderProvider;
var folderProvider = new FolderProvider(config.folders);
var DeviceProvider = require('./deviceProvider').DeviceProvider;
var deviceProvider = new DeviceProvider(redisClient);
var UserProvider = require('./userProvider').UserProvider;
var userProvider = new UserProvider(redisClient, deviceProvider);
var LinkCodeProvider = require('./linkCodeProvider').LinkCodeProvider;
var linkCodeProvider = new LinkCodeProvider();

var middleware = require('./middleware');
middleware.setup(userProvider, deviceProvider, folderProvider, linkCodeProvider);

var env = process.env.NODE_ENV || 'development';
if ('development' == env) {
  app.use(require('errorhandler')({
    dumpExceptions: true,
    showStack: true
  }));
}

if ('production' == env) {
  app.use(errors.errorHandler);
  app.use(express.errorHandler());
}

function auth(login, pass, next) {
  userProvider.findByLogin(login, function (error, user) {
    if (!user) {
      return next(new Error('Invalid login'));
    }

    if (user.checkPassword(pass)) {
      return next(null, user);
    } else {
      return next(new Error('Invalid login'));
    }
  });
}

// Routes
app.all(/^(?!\/api\/).+/, function (req, res, next) {
  session(req, res, next);
});

require('./api')(app, deviceProvider, folderProvider, middleware);

app.get('/', function (req, res) {
  res.redirect('/login');
});

app.get('/logout', function (req, res) {
  req.session.destroy(function () {
    res.redirect('login');
  });
});

app.get('/login', function (req, res) {
  userProvider.getUserCount(function (error, count) {
    if (count < 1) {
      res.redirect('/createFirstUser');
    } else {
      if (req.session.user) {
        res.redirect('/folder');
      } else {
        res.render('login');
      }
    }
  });
});

app.get('/createFirstUser', middleware.userDbEmpty, function (req, res) {
  res.render('createFirstUser', {
    formval: {}
  });
});

app.post('/createFirstUser', middleware.userDbEmpty, function (req, res) {
  var reRenderForm = function () {
    res.render('createFirstUser', {
      formval: req.body
    });
  };

  if (!req.body.passwd1) {
    req.flash('error', i18n.__('Password could not be empty'));
    return reRenderForm();
  }

  if (req.body.passwd1 != req.body.passwd2) {
    req.flash('error', i18n.__('Passwords must match'));
    return reRenderForm();
  }

  userProvider.createNew(req.body.login, req.body.realname, req.body.passwd1, true, [], function (error, user) {
    if (error) {
      req.flash('error', error);
      reRenderForm();
    } else {
      res.redirect('/login');
    }
  });
});

app.post('/login', function (req, res) {
  auth(req.body.login, req.body.password, function (error, user) {
    if (error) {
      req.flash('error', error);
      res.render('login');
    } else {
      if (user) {
        req.session.regenerate(function () {
          req.session.user = user;
          res.redirect('back');
        });
      } else {
        req.flash('error', error);
        res.render('login');
      }
    }
  });
});

app.get('/changeProfile', middleware.isLogged, function (req, res) {
  res.render('changeProfile', {
    formval: req.currentUser
  });
});

app.post('/changeProfile', middleware.isLogged, function (req, res, next) {
  var reRenderForm = function () {
    res.render('changeProfile', {
      formval: req.body
    });
  };

  var updatePassword = false;
  if (req.body.new1) {
    if (req.body.new1 != req.body.new2) {
      req.flash('error', i18n.__('Passwords must match'));
      return reRenderForm();
    }

    updatePassword = true;
  }

  var user = req.currentUser;
  if (updatePassword) {
    user.setPassword(req.body.new1);
    req.flash('info', i18n.__('Password updated'));
  }
  user.name = req.body.name;

  userProvider.updateUser(user, function (error) {
    req.flash('info', i18n.__('Profile updated'));
    res.redirect('back');
  });
});

app.get('/manageUsers', [middleware.isLogged, middleware.isAdmin], function (req, res, next) {
  userProvider.findAll(function (error, u) {
    if (error) {
      return next(error);
    }
    res.render('manageUsers', {
      users: u
    });
  });
});

app.get('/modifyUser/:uid', [middleware.isLogged, middleware.isAdmin, middleware.loadUser], function (req, res, next) {
  folderProvider.findAll(function (error, folders) {
    if (error) {
      return next(error);
    }
    res.render('modifyUser', {
      u: req.loadedUser,
      folders: folders
    });
  });
});

app.post('/modifyUser/:uid', [middleware.isLogged, middleware.isAdmin, middleware.loadUser], function (req, res, next) {
  folderProvider.findAll(function (error, folders) {
    if (error) {
      return next(error);
    }

    var u = req.loadedUser;
    u.name = req.body.name;
    u.admin = req.body.admin == 't' ? true : false;
    u.acl = req.body.acl ? req.body.acl : [];

    userProvider.updateUser(u, function (error) {
      req.flash('info', i18n.__('User updated'));
      res.redirect('back');
    });
  });
});

app.get('/deleteUser/:uid', [middleware.isLogged, middleware.isAdmin, middleware.loadUser], function (req, res, next) {
  res.render('deleteUser', {
    u: req.loadedUser
  });
});

app.post('/deleteUser/:uid', [middleware.isLogged, middleware.isAdmin, middleware.loadUser], function (req, res, next) {
  var reRenderForm = function () {
    res.render('deleteUser', {
      u: req.body
    });
  };

  var u = req.loadedUser;

  userProvider.deleteUser(u.uid, function (error) {
    if (error) {
      req.flash('error', error.message);
      reRenderForm();
    } else {
      req.flash('info', i18n.__('User deleted'));
      res.redirect('/manageUsers');
    }
  });
});

app.get('/createUser', [middleware.isLogged, middleware.isAdmin], function (req, res) {
  res.render('createUser', {
    formval: {}
  });
});

app.post('/createUser', [middleware.isLogged, middleware.isAdmin], function (req, res) {
  var reRenderForm = function () {
    res.render('createUser', {
      formval: req.body
    });
  };

  if (!req.body.passwd1) {
    req.flash('error', i18n.__('Password could not be empty'));
    return reRenderForm();
  }

  if (req.body.passwd1 != req.body.passwd2) {
    req.flash('error', i18n.__('Passwords must match'));
    return reRenderForm();
  }

  userProvider.createNew(req.body.login, req.body.realname, req.body.passwd1, req.body.admin == 't', [], function (error, user) {
    if (error) {
      req.flash('error', error);
      reRenderForm();
    } else {
      req.flash('info', i18n.__('User created'));
      res.redirect('/manageUsers');
    }
  });
});

//TODO: put logic that is shared between publicFolder and folder into helper func
app.get('/publicFolder/:folderId', function (req, res, next) {
  folderProvider.findById(req.params.folderId, function (error, folder) {
    if (!folder.pub) {
      next(new errors.Permission('This is not a public folder'));
    } else {
      var filename = req.param('name');
      if (!filename) {
        filename = 'file';
      }
      res.attachment(filename);

      folder.getRawData(req,
        function (error, data) {
          if (error) {
            return next(error);
          }
          res.write(data);
        },
        function (error, data) {
          if (error) {
            return next(error);
          }
          res.end();
        }
      );
    }
  });
});

app.get('/folder/:folderId?', middleware.isLogged, middleware.checkFolderAcl, function (req, res, next) {
  if (!req.params.folderId) {
    folderProvider.findAll(function (error, folders) {
      if (error) {
        return next(error);
      }

      utils.aclFilterFolderList(folders, req.currentUser);

      //show repo list
      res.render('folders', {
        folders: folders
      });
    });
  } else {
    //show specified folderId
    folderProvider.findById(req.params.folderId, function (error, folder) {
      if (error) {
        return next(error);
      }

      var curPath = req.param('path');
      var parUrl = null;

      if (curPath) {
        var parPath = curPath.split('/');
        parPath.pop();
        parPath = parPath.join('/');
        parUrl = querystring.stringify({
          path: parPath
        });
      }

      if (req.param('type') == 'file') {
        //show one file
        var filename = req.param('name');
        if (!filename) {
          filename = 'file';
        }

        //set Content-Disposition so file is downloaded by the browser (Content-Type will be set by .ext)
        res.attachment(filename);

        //content types that wil be treated as text (editable)
        var text_types = [
            'text/',
            'application/x-tex',
            'application/x-sh',
            'application/x-javascript',
            'application/xhtml+xml',
            'application/xml'
        ]

        //content types that will be passed to the browser and not downloaded
        var view_types = [
            'image/',
            'application/pdf',
        ]

        var is_editable = false;
        text_types.forEach(function(t){
            if(res.get('Content-Type').search(t) != -1 ){
                //display directly if text type
                //res.set('Content-Disposition', '')
                res.removeHeader('Content-Disposition')
                res.set('Content-Type', 'text/plain')
                is_editable = true
            }
        });

        view_types.forEach(function(t){
            if(res.get('Content-Type').search(t) != -1 ){
                res.set('Content-Disposition', '')
            }
        });

        if(req.param('download') == 'force'){
          is_editable = false
        }

        //download file
        folder.getRawData(req,
          function (error, data) {
            if (error) {
              return next(error);
            }
            if (is_editable) {
              //if we have a viewable type, render preview/edit view
              res.removeHeader('Content-Type')
              res.render('preview', {
                'file': filename,   //this file
                'path': curPath,    //repo path to file parent
                'parent': folder,   //parent directory id
                'data': data,
                'filehash': req.param('hash')
              })
              return
            } else {
              //otherwise just return the file contents
              res.write(data);
            }
          },
          function (error, data) {
            if (error) {
              return next(error);
            }
            if(!is_editable)
              res.end();
          }
        );
      } else {
        //show folder contents
        folder.getItems(req, function (error, list) {
          if (error) {
            return next(error);
          }

          res.render('folder', {
            folder: folder,
            tree: list,
            path: curPath,
            parUrl: parUrl
          });
        });
      }
    });
  }
});

app.post('/putFile/:folderId', middleware.isLogged, function (req, res, next) {
  if (!req.params.folderId) {
    return next(new Error('No folder id given'))
  } else {
    folderProvider.findById(req.params.folderId, function (error, folder) {
      if (error) {
        return next(error);
      }
      var filepath = req.param('path')
      if (req.body.content && filepath) {
          //call api method or common helper method to save file
          folder.putFile(req, req.body.content,
            function (error, data) {
              if (error) {
                return next(error);
              }
              res.redirect('/folder/'+folder.id+'?type=dir&path='+pathlib.basename(filepath))
          });
      } else { return next(new Error('no data from form')) }
    });
  }
});

app.get('/recentchanges/:folderId?', middleware.isLogged, middleware.checkFolderAcl, function (req, res, next) {
  folderProvider.findById(req.params.folderId, function (error, folder) {
    if (error) {
      return next(error);
    }
    folder.getRecentChanges(req, function (error, data) {
      if (error) {
        return next(error);
      }

      res.render('recentchanges', {
        data: data,
        folder: folder
      });
    });
  });
});

app.get('/download/:folderId', middleware.isLogged, middleware.checkFolderAcl, function (req, res, next) {
  folderProvider.findById(req.params.folderId, function (error, folder) {
    if (error) {
      return next(error);
    }
    var headersSent = false;
    var maybeSentHeaders = function () {
      if (headersSent) {
        return;
      }
      headersSent = true;
      var filename = 'archive';
      var path = req.param('path');
      if (path && path != '') {
        filename += '-' + path.replace(/[^\w\d-]/, '_');
      }
      filename += '-' + req.params.folderId.substring(0, 8) + '.zip';
      res.writeHead(200, {
        'Content-Type': 'application/zip',
        'Content-Disposition': 'attachment; filename="' + filename + '"'
      });
    };
    folder.createArchive(req, function (error, data) {
        if (error) {
          return next(error);
        }
        maybeSentHeaders();
        res.write(data);
      },
      function (error, data) {
        if (error) {
          return next(error);
        }
        maybeSentHeaders();
        res.end();
      }
    );
  });
});

app.get('/linkedDevices', middleware.isLogged, function (req, res, next) {
  if (req.currentUser.admin) {
    deviceProvider.findAll(function (error, devices) {
      if (error) {
        return next(error);
      }

      r = function (logins) {
        res.render('linkedDevices', {
          devices: devices,
          logins: logins
        });
      };

      var logins = {};
      userProvider.findAll(function (error, users) {
        var count = users.length;
        if (count === 0) {
          r(logins);
        }
        users.forEach(function (user) {
          logins[user.uid] = user.login;
          if (--count === 0) {
            r(logins);
          }
        });
      });
    });
  } else {
    deviceProvider.findByUserId(req.currentUser.uid, function (error, devices) {
      if (error) {
        return next(error);
      }
      res.render('linkedDevices', {
        devices: devices
      });
    });
  }
});

app.get('/linkDevice', middleware.isLogged, function (req, res) {
  var schema = config.https.enabled ? 'https' : 'http';
  var url = schema + '://' + req.host
  if (config.listen.port != 80) {
    url += ":" + config.listen.port;
  }

  if (config.externalUrl) {
    url = config.externalUrl;
  }

  res.render('linkDevice', {
    url: url
  });
});


app.get('/unlinkDevice/:did', [middleware.isLogged, middleware.loadDevice, middleware.owningDevice], function (req, res, next) {
  res.render('unlinkDevice', {
    d: req.loadedDevice
  });
});

app.post('/unlinkDevice/:did', [middleware.isLogged, middleware.loadDevice, middleware.owningDevice], function (req, res, next) {
  var d = req.loadedDevice;

  deviceProvider.unlinkDevice(d.id, function (error) {
    if (error) {
      req.flash('error', error.message);
      res.render('unlinkDevice', {
        d: req.loadedDevice
      });
    } else {
      req.flash('info', i18n.__('Device unlinked'));
      res.redirect('/linkedDevices');
    }
  });
});

app.get('/modifyDevice/:did', [middleware.isLogged, middleware.loadDevice, middleware.owningDevice], function (req, res, next) {
  res.render('modifyDevice', {
    d: req.loadedDevice
  });
});

app.post('/modifyDevice/:did', [middleware.isLogged, middleware.loadDevice, middleware.owningDevice], function (req, res, next) {
  var d = req.loadedDevice;
  d.name = req.body.name;

  deviceProvider.updateDevice(d, function (error) {
    req.flash('info', i18n.__('Device updated'));
    res.redirect('back');
  });
});

app.get('/getLinkCode', middleware.isLogged, function (req, res) {
  var code = linkCodeProvider.getNewCode(req.currentUser.uid);
  var schema = config.https.enabled ? 'https' : 'http';
  code.url = schema + '://' + req.header('host');

  if (config.externalUrl) {
    code.url = config.externalUrl;
  }

  res.contentType('application/json');
  res.send(code);
});

// always keep this as last route
app.get('/stylesheets', function (req, res, next) {
  next();
});

app.get('*', function (req, res, next) {
  next(new errors.NotFound(req.url));
});

function runApp() {
  app.listen(config.listen.port, config.listen.host, function () {
    console.log("SparkleShare Dashboard listening on port %d in %s mode", config.listen.port, app.settings.env);
  });

  if (config.fanout.enabled) {
    var fanout = require('./fanout/fanout');
    fanout.listen(config.fanout.port, config.fanout.host, function () {
      console.log("SparkleShare Fanout listening on port %d", config.fanout.port);
    });
  }
}

// upgrade database
require('./upgrade').upgrade(redisClient, runApp);
