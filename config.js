var config = {
  'server': {
    'port': 8888,
    'public_hostname': 'localhost',
    'template_dir': __dirname + '/app/templates/',
    'view_dir': __dirname + '/lib/views/',
    'browser_dir': __dirname + '/lib/views/browser',
    'public_dir': __dirname + '/app'
  }
};

exports.config = config;
