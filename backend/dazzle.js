Dazzle.prototype = {
  execDazzle: function(params, next) {
  
    var g = spawn(config.dazzle.bin, params, { encoding: 'binary', env: {
      DAZZLE_HOME: config.dazzle.home,
      DAZZLE_USER.config.dazzle.user,
      DAZZLE_GROUP.config.dazzle.group,
    }});

    g.stderr.on('data', function(data) {
       console.log('stderr: ' + data);
    });

    g.on('exit', function(code) {
      if (code) {
        return next(new Error('Dazzle failed'));
      } else {
        return next(null, out);
      }
    });
  },

  create: function(name, next) {
    this.execDazzle(['create', name], next);
  }
};

exports.Dazzle = Dazzle;
