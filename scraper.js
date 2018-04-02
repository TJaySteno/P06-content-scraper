var fs = require('fs');

try {
  fs.mkdirSync('data');
} catch (err) {
  if (err.code == 'EXIST') {
    console.error('data directory already exists');
  } else {
    console.error(err.message);
  }
}

console.log('done');
