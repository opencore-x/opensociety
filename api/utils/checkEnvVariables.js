function checkForEnvironmentVariables() {
  checkEnv('MONGO_CONNECTION_STRING');
  checkEnv('JWT_TOKEN');
}

function checkEnv(variable) {
  if (!process.env[variable]) {
    console.log(`FATAL ERROR: ${variable} STRING NOT PRESENT`);
    process.exit(1);
  }
}

module.exports = checkForEnvironmentVariables;
