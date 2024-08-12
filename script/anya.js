module.exports.config = {
    name: "anya",
    version: "1.0.0",
    role: 0,
    credits: "chill",
    description: "Synthesize voice",
    hasPrefix: false,
    aliases: ["voice"],
    usage: "[anya <text>]",
    cooldown: 5
};

const chilli = require("axios");
const pogi = require("fs");
const pangit = require("path");

module.exports.run = async function({ api, event, args }) {
    try {
        const cutemochill = args.join(" ");
        if (!cutemochill) {
            api.sendMessage("Usage: anya <text>", event.threadID);
            return;
        }

        api.sendMessage("🤖 | Synthesizing voice, please wait...", event.threadID);

        const response = await chilli.get(`https://ggwp-yyxy.onrender.com/new/voicevox-synthesis?id=1&text=hello=${encodeURIComponent(cutemochill)}`, {
            responseType: 'arraybuffer'
        });

        const cutemochillPath = pangit.join(__dirname, `/cache/voice_message.wav`);
        pogi.writeFileSync(cutemochillPath, Buffer.from(response.data, 'binary'));

        api.sendMessage({
            body: ``,
            attachment: pogi.createReadStream(cutemochillPath)
        }, event.threadID, () => {
            pogi.unlinkSync(cutemochillPath);
        });
    } catch (error) {
        console.error('Error:', error);
        api.sendMessage("An error occurred while processing the request.", event.threadID);
    }
};
