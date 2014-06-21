exports.sessionSecret = 'JustSomeRandomString';

exports.folders = [
  { type: 'git', name: 'Public GIT folder', path: '/mnt/data/repos/repo1', pub: true },
  { type: 'git', name: 'Private GIT folder', path: '/mnt/data/repos/repo2', pub: false }
];

exports.listen = {
  port: 3000,
  host: null
};

exports.https = {
  enabled: false,
  key: '/path/to/private.key',
  cert: '/path/to/cert.crt'
};

exports.basepath = '';
exports.externalUrl = null;

// 300 sec
exports.linkCodeValidFor = 300;

// none | min | info | debug
exports.logging = 'none';

exports.fanout = {
  enabled: false,
  host: null,
  port: 1986
};

exports.backend = {
  'git': {
    'bin': 'git',               //the git executable
    'temp': '/mnt/data/temp'    //directory used for local checkouts (should exist)
  }
};
