const req = require.context('./background/', true, /(spec|test)\.js$/);
req.keys().forEach(req);
