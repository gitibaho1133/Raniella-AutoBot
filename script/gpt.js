const axios = require('axios');

module.exports.config = {
  name: 'gpt',
  version: '1.0.0',
  hasPermission: 0,
  usePrefix: false,
  aliases: ['gpt', 'openai'],
  description: "An AI command powered by GPT-4",
  usages: "ai [prompt]",
  credits: 'Developer',
  cooldowns: 3,
  dependencies: {
    "axios": ""
  }
};

module.exports.run = async function({ api, event, args }) {
  const input = args.join(' ');

  if (!input) {
    api.sendMessage(`Please provide a question or statement after 'gpt'. For example: 'gpt What is the capital of France?'`, event.threadID, event.messageID);
    return;
  }
  
  if (input === "clear") {
    try {
      await axios.post('https://satomoigpt.onrender.com/clear', { id: event.senderID });
      return api.sendMessage("Chat history has been cleared.", event.threadID, event.messageID);
    } catch {
      return api.sendMessage('An error occurred while clearing the chat history.', event.threadID, event.messageID);
    }
  }

  api.sendMessage(`🔍 "${input}"`, event.threadID, event.messageID);
  
  try {
    const url = event.type === "message_reply" && event.messageReply.attachments[0]?.type === "photo"
      ? { link: event.messageReply.attachments[0].url }
      : {};

    const { data } = await axios.post('https://satomoigpt.onrender.com/chat', {
      prompt: input,
      customId: event.senderID,
      ...url
    });

    api.sendMessage(`${data.message}`, event.threadID, (err, messageInfo) => {
      if (err) return;
const now = new Date(); 
const formattedDate = now.toLocaleString('en-US', { timeZone: 'Asia/Manila' }); 
api.sendMessage(`Add owner bot if you want to create your own bot. The total answered questions are ${data.count}. As of ${formattedDate}.`, event.threadID);

    }, event.messageID);
    
  } catch {
    api.sendMessage('An error occurred while processing your request.', event.threadID, event.messageID);
  }
};
