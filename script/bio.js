module.exports.config = {
  name: "bio",
  version: "1.7",
  author: "Arn",
  countDown: 5,
  role: 2,
  shortDescription: {
    vi: " ",
    en: "change bot bio ",
  },
  longDescription: {
    vi: " ",
    en: "change bot bio ",
  },
  category: "owner",
  guide: {
    en: "{pn} (text)",
  },
};

module.exports.run = async ({ args, message, api }) => {
  try {
    api.changeBio(args.join(" "));
    message.reply("admin change bot bio to:" + args.join(" "));
  } catch (error) {
    console.error(error);
  }
};
