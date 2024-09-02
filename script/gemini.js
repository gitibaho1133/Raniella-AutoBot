module.exports.config = {
  name: "gemini",
  role: 0,
  credits: "Deku",
  description: "Talk to Gemini (conversational)",
  hasPrefix: false,
  version: "5.6.7",
  aliases: ["bard"],
  usage: "gemini [prompt]"
};

module.exports.run = async function ({ api, event, args }) {
  const axios = require("axios");
  let prompt = encodeURIComponent(args.join(" ")),
    uid = event.senderID,
    url;
  if (!prompt) return api.sendMessage(`Please enter a prompt.`, event.threadID);
  api.sendTypingIndicator(event.threadID);
  try {
    const geminiApi = `https://deku-rest-api.gleeze.com/api/gemini-1.5-pro?q=who%20are%20you?`;
    if (event.type == "message_reply") {
      if (event.messageReply.attachments[0]?.type == "photo") {
        url = encodeURIComponent(event.messageReply.attachments[0].url);
        const res = (await axios.get(`${geminiApi}/gemini?prompt=${prompt}&url=${url}`)).data;
        return api.sendMessage(res.gemini, event.threadID);
      } else {
        return api.sendMessage('Please reply to an image.', event.threadID);
      }
    }
    const response = (await axios.get(`${geminiApi}/gemini?prompt=${prompt}`)).data;
    return api.sendMessage(response.gemini, event.threadID);
  } catch (error) {
    console.error(error);
    return api.sendMessage('Error skills issue', event.threadID);
  }
};
