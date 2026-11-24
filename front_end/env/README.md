# Refreshing `.env` with `updateEnvFile.js`

The `updateEnvFile.js` script is designed to keep your local `.env` file up to date with the latest secrets stored in AWS Secrets Manager.

**If you still need to set up your AWS CLI, please follow the instructions in the TL;DW confluence doc [here.](https://curveroyaltysystems.atlassian.net/wiki/spaces/Operations/pages/1121124353/AWS+CLI+Quickstart)**

## How It Works

- **Fetches Secrets:** The script connects to AWS Secrets Manager using your configured AWS credentials.
- **Retrieves Latest Values:** It pulls the most recent secret values required for your application.
- **Overwrites `.env`:** The script writes these secrets directly to your local `.env` file, replacing any existing values.
- **Ensures Consistency:** This process ensures your environment variables always reflect the latest secure values from AWS.

## Usage

Run the script from your project root directory:

```bash
node ./env/updateEnvFile.js
```
or
```bash
npm run env:refresh
```

## Notes

- Make sure you have the necessary AWS permissions/role to access the secrets.
- Any manual changes to `.env` will be overwritten each time you run the script.

For more infomation on how to set up AWS CLI to use this script feel free to watch the demo video [here.](https://drive.google.com/file/d/1_RfffaPF6Byi7Zp0a8ljvI2g_3GZ7NJ8/view?usp=drive_link)
The video is a little outdated as we have made changes to the way we want to handle things, but the main points are still valid, I have set up a TL;DW confluence doc to quick-start you [here.](https://curveroyaltysystems.atlassian.net/wiki/spaces/Operations/pages/1121124353/AWS+CLI+Quickstart)