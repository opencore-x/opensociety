export default function checkForEnvironmentVariable(variable) {
  if (!process.env.variable) {
    console.log('FATAL ERROR: MONGO CONNECTION STRING NOT PRESENT');
    process.exit(1);
  }
}
