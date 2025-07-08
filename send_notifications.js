import fs from 'fs';
import path from 'path';
import apn from 'apn';

// Load APNs credentials from environment variables
const key = process.env.APNS_KEY.replace(/\\n/g, '\n'); // Fix newline characters if pasted as string
const keyId = process.env.APNS_KEY_ID;
const teamId = process.env.APNS_TEAM_ID;
const bundleId = process.env.APNS_BUNDLE_ID;

// Path to your notifications.json file
const notificationsFile = path.resolve(process.cwd(), 'notifications.json');

// Load the device tokens list
// You need to maintain this list elsewhere, e.g. a JSON file or database
// For this example, assume a JSON file device_tokens.json in your repo root
const deviceTokensFile = path.resolve(process.cwd(), 'device_tokens.json');

async function main() {
  try {
    // Load notifications from JSON
    const notificationsRaw = fs.readFileSync(notificationsFile, 'utf8');
    const notifications = JSON.parse(notificationsRaw);

    // Load device tokens
    if (!fs.existsSync(deviceTokensFile)) {
      console.log('No device tokens file found, exiting.');
      return;
    }
    const tokensRaw = fs.readFileSync(deviceTokensFile, 'utf8');
    const deviceTokens = JSON.parse(tokensRaw);

    if (!deviceTokens.length) {
      console.log('No device tokens registered, exiting.');
      return;
    }

    // Load or create a local file to keep track of sent notification IDs
    const sentIdsFile = path.resolve(process.cwd(), 'sent_notification_ids.json');
    let sentIds = [];
    if (fs.existsSync(sentIdsFile)) {
      const sentIdsRaw = fs.readFileSync(sentIdsFile, 'utf8');
      sentIds = JSON.parse(sentIdsRaw);
    }

    // Setup APNs provider
    const apnProvider = new apn.Provider({
      token: {
        key,
        keyId,
        teamId,
      },
      production: false, // Change to true for App Store builds
    });

    for (const notification of notifications) {
      if (sentIds.includes(notification.id)) {
        console.log(`Skipping already sent notification: ${notification.id}`);
        continue;
      }

      // Compose notification
      const note = new apn.Notification({
        alert: {
          title: notification.title,
          body: notification.body,
        },
        topic: bundleId,
      });

      // Send notification to all device tokens
      const result = await apnProvider.send(note, deviceTokens);

      console.log(`Sent notification ${notification.id}:`, result);

      // Track sent ID to prevent resending
      sentIds.push(notification.id);

      // Save updated sent IDs
      fs.writeFileSync(sentIdsFile, JSON.stringify(sentIds, null, 2));
    }

    // Shutdown the APNs provider
    apnProvider.shutdown();

  } catch (error) {
    console.error('Error sending notifications:', error);
  }
}

main();
