const axios = require('axios');

module.exports.config = {
  name: 'gpt',
  version: '1.0.0',
  role: 0,
  hasPrefix: false,
  aliases: ['gpt', 'openai'],
  description: "An AI command powered by GPT-4",
  usage: "Ai [question]",
  credits: 'joshua Apostol',
  cooldown: 3,
};

module.exports.run = async function({ api, event, args }) {
  const input = args.join(' ');

  if (!input) {
    api.sendMessage(`Please provide a question or statement after 'gpt4o'. For example: 'gp4o What is the capital of France?'`, event.threadID, event.messageID);
    return;
  }

  api.sendMessage('Please wait...', event.threadID, event.messageID);

  try {
    const { data } = await axios.get(`https://ggwp-yyxy.onrender.com/gpt4?prompt=hi&uid=100${encodeURIComponent(input)}`);
    let response = JSON.parse(data.answer).response;
    
    response = response.replace(/\n\nIs this answer helpful to you\?/, '');

    api.sendMessage(response, event.threadID, event.messageID);
  } catch (error) {
    api.sendMessage('An error occurred while processing your request.', event.threadID, event.messageID);
  }
};
