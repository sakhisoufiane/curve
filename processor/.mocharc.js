module.exports = {
    "exit": true, //Force Mocha to quit after tests complete
    "bail": true, //Abort after first test failure 
    "parallel": true, //Run tests in parallel 
    "timeout": "60s", //Specify test timeout threshold
    "diff": true, //Show diff on failure
    "forbid-only": true, //Fail if .only test(s) encountered
    "retries": 3, //Retry failed tests 3 times
}