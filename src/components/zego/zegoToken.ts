const crypto = require('crypto');

function generateZegoToken(appID, userID, serverSecret, effectiveTimeInSeconds) {
  const timestamp = Math.floor(Date.now() / 1000);
  const nonce = Math.floor(Math.random() * 1000000);
  const payload = {
    app_id: appID,
    user_id: userID,
    nonce,
    ctime: timestamp,
    expire: timestamp + effectiveTimeInSeconds,
  };

  const payloadStr = JSON.stringify(payload);
  const hash = crypto.createHmac('sha256', serverSecret)
    .update(payloadStr)
    .digest('hex');
  return `04${Buffer.from(payloadStr).toString('base64')}${hash}`;
}

module.exports = { generateZegoToken };