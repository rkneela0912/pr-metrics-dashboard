const core = require('@actions/core');
const github = require('@actions/github');
async function run() {
  try {
    core.info('Action executed successfully');
  } catch (error) {
    core.setFailed(error.message);
  }
}
run();
