const req = require.context('./scripts/', true, /(spec|test)\.js$/);
req.keys().forEach(req);
