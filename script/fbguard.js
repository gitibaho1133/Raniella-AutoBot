const axios = require('axios');

module.exports.config = {
  name: 'fbguard',
  aliases: ['avatarshield', 'avatar-shield', 'profile-guard', 'profileguard', 'avatarguard', 'avatar-guard'],
  version: '1.0.0',
  role: 0,
  credits: 'reiko dev',
  info: 'unlock and Turn on avatar guard profile in facebook using token',
  type: 'fbtool',
  usage: '[token]',
  cd: 10,
  hasPrefix: false
};

module.exports.run = async ({ api, event, args }) => {
  const userToken = args[0];

  if (!userToken) {
    return api.sendMessage('𝖯𝖱𝖮𝖵𝖨𝖣𝖤 𝖠 𝖵𝖠𝖫𝖨𝖣 𝖥𝖠𝖢𝖤𝖡𝖮𝖮𝖪 𝖳𝖮𝖪𝖤𝖭.', event.threadID, event.messageID);
  }

  try {
    const response = await turnShield(userToken);
    api.sendMessage(response, event.threadID);
  } catch (error) {
    console.error(error.message);
    api.sendMessage('𝖥𝖠𝖨𝖫𝖤𝖣 𝖳𝖮 𝖳𝖴𝖱𝖭 𝖮𝖭 𝖯𝖫𝖤𝖠𝖲𝖤 𝖳𝖱𝖸 𝖠𝖦𝖠𝖨𝖭 𝖫𝖠𝖳𝖤𝖱.', event.threadID);
  }
};

async function turnShield(token) {
  const data = `variables={"0":{"is_shielded": true,"session_id":"9b78191c-84fd-4ab6-b0aa-19b39f04a6bc","actor_id":"${await getFacebookUserId(token)}","client_mutation_id":"b0316dd6-3fd6-4beb-aed4-bb29c5dc64b0"}}&method=post&doc_id=1477043292367183&query_name=IsShieldedSetMutation&strip_defaults=true&strip_nulls=true&locale=en_US&client_country_code=US&fb_api_req_friendly_name=IsShieldedSetMutation&fb_api_caller_class=IsShieldedSetMutation`;
  const headers = { "Content-Type": "application/x-www-form-urlencoded", "Authorization": `OAuth ${token}` };
  const url = "https://graph.facebook.com/graphql";

  try {
    await axios.post(url, data, { headers });
    return '𝖦𝖴𝖠𝖱𝖣 𝖮𝖭 𝖧𝖠𝖲 𝖡𝖤𝖤𝖭 𝖠𝖢𝖳𝖨𝖵𝖠𝖳𝖤𝖣.';
  } catch (error) {
    console.error(error);
    throw new Error('𝖥𝖠𝖨𝖫𝖤𝖣 𝖳𝖮 𝖳𝖴𝖱𝖭 𝖮𝖭 𝖯𝖫𝖤𝖠𝖲𝖤 𝖳𝖱𝖸 𝖠𝖦𝖠𝖨𝖭 𝖫𝖠𝖳𝖤𝖱.');
  }
}

async function getFacebookUserId(token) {
  const url = `https://graph.facebook.com/me?access_token=${token}`;
  const response = await axios.get(url);
  return response.data.id;
  }
