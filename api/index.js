const { app, initDatabase } = require('../server');

let databaseInitialization;

module.exports = async function handler(req, res) {
  if (!databaseInitialization) {
    databaseInitialization = initDatabase().catch((error) => {
      databaseInitialization = undefined;
      throw error;
    });
  }

  await databaseInitialization;
  return app(req, res);
};
