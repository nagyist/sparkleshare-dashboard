var config = require('../config');
var spawn = require('child_process').spawn;

module.exports = {
  create: function(name, next) {
  
    var g = spawn(config.dazzle.bin, ['create', name], { encoding: 'binary', env: {
      DAZZLE_HOME: config.dazzle.home,
      DAZZLE_USER: config.dazzle.user,
      DAZZLE_GROUP: config.dazzle.group
    }});

    g.stderr.on('data', function(data) {
       console.log('stderr: ' + data);
    });

    var out;
    g.stdout.on('data', function(data) {
       out += data.toString('utf8');
    });


    g.on('exit', function(code) {
      if (code) {
        return next(new Error('Dazzle failed'));
      } else {
        return next(null, config.repository_home+'/'+name+'.git');
      }
    });
  }
};
