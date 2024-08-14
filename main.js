const fs = require('fs');
const path = require('path');
const login = require('./fb-chat-api/index');
const express = require('express');
const app = express();
const chalk = require('chalk');
const bodyParser = require('body-parser');
const script = path.join(__dirname, 'script');
const cron = require('node-cron');
const config = fs.existsSync('./data') && fs.existsSync('./data/config.json') ? JSON.parse(fs.readFileSync('./data/config.json', 'utf8')) : createConfig();
const Utils = new Object({
  commands: new Map(),
  handleEvent: new Map(),
  account: new Map(),
   cds: new Map(),
  ObjectReply: new Map(),
  handleReply: [],
});
fs.readdirSync(script).forEach((file) => {
  const scripts = path.join(script, file);
  const stats = fs.statSync(scripts);

  if (stats.isDirectory()) {
    fs.readdirSync(scripts).forEach((file) => {
      const filePath = path.join(scripts, file);

      if (path.extname(filePath).toLowerCase() === '.js') {
        try {
          const {
            config,
            run,
            handleEvent,
            handleReply
          } = require(filePath);

          if (config) {
            const {
              name = [], role = '0', version = '1.0.0', hasPrefix = true, aliases = [], info = '', usage = '', credits = '',  cd = '5'
            } = Object.fromEntries(Object.entries(config).map(([key, value]) => [key.toLowerCase(), value]));

            aliases.push(name);

            if (run) {
              Utils.commands.set(aliases, {
                name,
                role,
                run,
                aliases,
                info,
                usage,
                version,
                hasPrefix: config.hasPrefix,
                credits,
                cd
              });
            }

            if (handleEvent) {
              Utils.handleEvent.set(aliases, {
                name,
                handleEvent,
                role,
                info,
                usage,
                version,
                hasPrefix: config.hasPrefix,
                credits,
                cd
              });
            }

            if (handleReply) {
              Utils.ObjectReply.set(aliases, {
                name,
                handleReply,
              });
            }
          }
        } catch (error) {
          console.error(chalk.red(`Error installing command from file ${file}: ${error.message}`));
        }
      }
    });
  } else if (path.extname(scripts).toLowerCase() === '.js') {
    try {
      const {
        config,
        run,
        handleEvent,
        handleReply
      } = require(scripts);

      if (config) {
        const {
          name = [], role = '0', version = '1.0.0', hasPrefix = true, aliases = [], info = '', usage = '', credits = '',  cd = '5'
        } = Object.fromEntries(Object.entries(config).map(([key, value]) => [key.toLowerCase(), value]));

        aliases.push(name);

        if (run) {
          Utils.commands.set(aliases, {
            name,
            role,
            run,
            aliases,
            info,
            usage,
            version,
            hasPrefix: config.hasPrefix,
            credits,
            cd
          });
        }

        if (handleEvent) {
          Utils.handleEvent.set(aliases, {
            name,
            handleEvent,
            role,
            info,
            usage,
            version,
            hasPrefix: config.hasPrefix,
            credits,
            cd
          });
        }

        if (handleReply) {
          Utils.ObjectReply.set(aliases, {
            name,
            handleReply,
          });
        }
      }
    } catch (error) {
      console.error(chalk.red(`Error installing command from file ${file}: ${error.message}`));
    }
  }
});

app.use(express.static(path.join(__dirname, 'public')));
app.use(bodyParser.json());
app.use(express.json());
const routes = [{
  path: '/',
  file: 'index.html'
}, {
  path: '/step_by_step_guide',
  file: 'guide.html'
}, {
  path: '/online_user',
  file: 'online.html'
}, ];
routes.forEach(route => {
  app.get(route.path, (req, res) => {
    res.sendFile(path.join(__dirname, 'public', route.file));
  });
});
app.get('/info', (req, res) => {
  const data = Array.from(Utils.account.values()).map(account => ({
    name: account.name,
    profileUrl: account.profileUrl,
    thumbSrc: account.thumbSrc,
    time: account.time
  }));
  res.json(JSON.parse(JSON.stringify(data, null, 2)));
});
app.get('/commands', (req, res) => {
  const command = new Set();
  const commands = [...Utils.commands.values()].map(({
    name
  }) => (command.add(name), name));
  const handleEvent = [...Utils.handleEvent.values()].map(({
    name
  }) => command.has(name) ? null : (command.add(name), name)).filter(Boolean);
  const role = [...Utils.commands.values()].map(({
    role
  }) => (command.add(role), role));
  const aliases = [...Utils.commands.values()].map(({
    aliases
  }) => (command.add(aliases), aliases));
  res.json(JSON.parse(JSON.stringify({
    commands,
    handleEvent,
    role,
    aliases
  }, null, 2)));
});
app.post('/login', async (req, res) => {
  const {
    state,
    commands,
    prefix,
    admin
  } = req.body;
  try {
    if (!state) {
      throw new Error('Missing app state data');
    }
    const cUser = state.find(item => item.key === 'c_user');
    if (cUser) {
      const existingUser = Utils.account.get(cUser.value);
      if (existingUser) {
        console.log(`User ${cUser.value} is already logged in`);
        return res.status(400).json({
          error: false,
          message: "Active user session detected; already logged in",
          user: existingUser
        });
      } else {
        try {
          await accountLogin(state, commands, prefix, [admin]);
          res.status(200).json({
            success: true,
            message: 'Authentication process completed successfully; login achieved.'
          });
        } catch (error) {
          console.error(error);
          res.status(400).json({
            error: true,
            message: error.message
          });
        }
      }
    } else {
      return res.status(400).json({
        error: true,
        message: "There's an issue with the appstate data; it's invalid."
      });
    }
  } catch (error) {
    return res.status(400).json({
      error: true,
      message: "There's an issue with the appstate data; it's invalid."
    });
  }
});
const port = process.env.PORT || 3000;
app.listen(port,() => {
    console.log(`
\x1b[34mAUTOBOT is online\x1b[0m

apps is listening port ${port}`);
});
process.on('unhandledRejection', (reason) => {
  console.error('Unhandled Promise Rejection:', reason);
});
async function accountLogin(state, enableCommands = [], prefix, admin = []) {
  return new Promise((resolve, reject) => {
    login({
      appState: state
    }, async (error, api) => {
      if (error) {
        reject(error);
        return;
      }
      const userid = await api.getCurrentUserID();
      addThisUser(userid, enableCommands, state, prefix, admin);
      try {
        const userInfo = await api.getUserInfo(userid);
        if (!userInfo || !userInfo[userid]?.name || !userInfo[userid]?.profileUrl || !userInfo[userid]?.thumbSrc) throw new Error('Unable to locate the account; it appears to be in a suspended or locked state.');
        const {
          name,
          profileUrl,
          thumbSrc
        } = userInfo[userid];
        let time = (JSON.parse(fs.readFileSync('./data/history.json', 'utf-8')).find(user => user.userid === userid) || {}).time || 0;
        Utils.account.set(userid, {
          name,
          profileUrl,
          thumbSrc,
          time: time
        });
        const intervalId = setInterval(() => {
          try {
            const account = Utils.account.get(userid);
            if (!account) throw new Error('Account not found');
            Utils.account.set(userid, {
              ...account,
              time: account.time + 1
            });
          } catch (error) {
            clearInterval(intervalId);
            return;
          }
        }, 1000);
      } catch (error) {
        reject(error);
        return;
      }
      api.setOptions({
        listenEvents: config[0].fcaOption.listenEvents,
        logLevel: config[0].fcaOption.logLevel,
        updatePresence: config[0].fcaOption.updatePresence,
        selfListen: config[0].fcaOption.selfListen,
        forceLogin: config[0].fcaOption.forceLogin,
        online: config[0].fcaOption.online,
        autoMarkDelivery: config[0].fcaOption.autoMarkDelivery,
        autoMarkRead: config[0].fcaOption.autoMarkRead,
      });
      try {
        api.listenMqtt(async (error, event) => {
          if (error) {
            if (error === 'Connection closed.') {}
          }
          if (event?.senderID === userid) return
          let database = await fs.existsSync('./data/database.json') ? JSON.parse(fs.readFileSync('./data/database.json', 'utf8')) : createDatabase();
          let history = await fs.existsSync('./data/history.json') ? JSON.parse(fs.readFileSync('./data/history.json')) : {};
          if (!userid === event.senderID || database.length === 0 || !Object.keys(database[0]?.Threads || {}).includes(event?.threadID)) {
            create = createThread(event.threadID, api);
          } else {
            update = updateThread(event?.senderID)
          }
          let blacklist = (history.find(blacklist => blacklist.userid === userid) || {}).blacklist || [];
          let hasPrefix = (event.body && aliases((event.body || '')?.trim().toLowerCase().split(/ +/).shift())?.hasPrefix == false) ? '' : prefix;
          let [command, ...args] = ((event.body || '').trim().toLowerCase().startsWith(hasPrefix?.toLowerCase()) ? (event.body || '').trim().substring(hasPrefix?.length).trim().split(/\s+/).map(arg => arg.trim()) : []);
          if (hasPrefix && aliases(command)?.hasPrefix === false) {
            api.sendMessage(`Invalid usage this command doesn't need a prefix`, event.threadID, event.messageID);
            return;
          }
          if (event.body && enableCommands[0].commands.includes(aliases(command?.toLowerCase())?.name)) {
            const role = aliases(command)?.role ?? 0;
            const isAdmin = config?.[0]?.masterKey?.admin?.includes(event.senderID) || admin.includes(event.senderID);
            const isThreadAdmin = isAdmin || (Object.values(database[0]?.Threads[event.threadID]?.adminIDs || {}).some(admin => admin.id === event.senderID));
            if ((role === 1 && !isAdmin) || (role === 2 && !isThreadAdmin) || (role === 3 && !config?.[0]?.masterKey?.admin?.includes(event.senderID))) {
              api.sendMessage(`You don't have permission to use this command.`, event.threadID, event.messageID);
              return;
            }
          }
           if (event.body !== null) {
          if (event.logMessageType === "log:subscribe") {

                const fs = require("fs-extra");
                const { threadID } = event;

                if (
                  event.logMessageData.addedParticipants &&
                  Array.isArray(event.logMessageData.addedParticipants) &&
                  event.logMessageData.addedParticipants.some(
                    i => i.userFbId == userid
                  )
                ) {
                  api.changeNickname(
                    `Autbot Ai`,
                    threadID,
                    userid
                  );
/*
                  const oa = await api.getUserInfo(admin[0]);
                  const name1231 = oa[admin[0]].name;
                  const kakainis_ka = await api.getThreadInfo(event.threadID);
//api.sendMessage(`\nCONNECTED...\nAdmin Profile Link: https://www.facebook.com/profile.php?id=${admin[0]}\nThread GC: ${kakainis_ka.threadName}\nTime added: ${time}, ${thu}`, "100086928967994");             api.sendMessage(
                        {
                          body: `Connected Success! \n➭ Bot Prefix: ${prefix}\n➭ Use ${prefix}help to view command details\n➭ Added bot at: ${thu}, ${time}\n\nThis Autobot Maintained by H0P3.`,
                          
                          mentions: [
                            {
                              tag: "@raniel" + name123,
                              id: 100092248658233[0]
                            }
                          ]
                          }, event.threadID, (err,info) => {
                          api.pinMessage(true, info.messageID, event.threadID, () => {});
                          });
                    */
                  } else {
                  try {
                    const fs = require("fs-extra");
                    let {
                      threadName,
                      participantIDs
                    } = await api.getThreadInfo(threadID);

                    var mentions = [],
                      nameArray = [],
                      memLength = [],
                      userID = [],
                      i = 0;

                    let addedParticipants1 =
                      event.logMessageData.addedParticipants;
                    for (let newParticipant of addedParticipants1) {
                      let userID = newParticipant.userFbId;
                      api.getUserInfo(parseInt(userID), (err, data) => {
                        if (err) {
                          return console.log(err);
                        }
                        var obj = Object.keys(data);
                        var userName = data[obj].name.replace("@", "");
                    if (userID !== api.getCurrentUserID()) {

                                            nameArray.push(userName);
                                            mentions.push({ tag: userName, id: userID, fromIndex: 0 });

                                            memLength.push(participantIDs.length - i++);
                                            memLength.sort((a, b) => a - b);

                                              (typeof threadID.customJoin == "undefined") ? msg = "👋 Hello, {uName}!\n\nWelcome to {threadName}!\nYou're the {soThanhVien} member of this group, please enjoy! 🥳" : msg = threadID.customJoin;
                                              msg = msg
                                                .replace(/\{uName}/g, nameArray.join(', '))
                                                .replace(/\{type}/g, (memLength.length > 1) ? 'you' : 'Friend')
                                                .replace(/\{soThanhVien}/g, memLength.join(', '))
                                                .replace(/\{threadName}/g, threadName);

                  
                    api.sendMessage({ body: msg,
                      mentions }, event.threadID)
                                                           }
                                                        })
                                                      }
                                                    } catch (err) {
                                                      return console.log("ERROR: " + err);
                                }
                               }
                              }
                              }
            if (event.body !== null) {
              if (event.logMessageType === "log:unsubscribe") {
                api.getThreadInfo(event.threadID).then(({ participantIDs }) => {
                  let leaverID = event.logMessageData.leftParticipantFbId;
                  api.getUserInfo(leaverID, (err, userInfo) => {
                    if (err) {
                      return console.error("Failed to get user info:", err);
                    }
                    const name = userInfo[leaverID].name;
                    const type =
                      event.author == event.logMessageData.leftParticipantFbId
                        ? "left the group."
                        : "was kicked by admin of the group";

                    
                    // Assuming the file exists, send the message with the GIF
                    api.sendMessage(
                      {
                        body: `${name} ${type}, There are now ${participantIDs.length} members in the group, please enjoy!`
                        },
                      event.threadID, () => {}
                    );
                  });
                });
              }
            }
          if (event.body && event.body?.toLowerCase().startsWith(prefix.toLowerCase()) && aliases(command)?.name && enableCommands[0].commands.includes(aliases(command?.toLowerCase())?.name)) {
            if (blacklist.includes(event.senderID)) {
              api.sendMessage("We're sorry, but you've been banned from using bot. If you believe this is a mistake or would like to appeal, please contact one of the bot admins for further assistance.", event.threadID, event.messageID);
              return;
            }
          }
          if (event.body && aliases(command)?.name) {
            const now = Date.now();
            const name = aliases(command)?.name;
            const sender = Utils. cds.get(`${event.senderID}_${name}_${userid}`);
            const delay = aliases(command)?. cd ?? 0;
            if (!sender || (now - sender.timestamp) >= delay * 1000) {
              Utils. cds.set(`${event.senderID}_${name}_${userid}`, {
                timestamp: now,
                command: name
              });
            } else {
              const active = Math.ceil((sender.timestamp + delay * 1000 - now) / 1000);
              api.sendMessage(`Please wait ${active} seconds before using the "${name}" command again.`, event.threadID, event.messageID);
              return;
            }
          }
          if (event.body && !command && event.body?.toLowerCase().startsWith(prefix.toLowerCase())) {
            api.sendMessage(`Invalid command please use ${prefix}help to see the list of available commands.`, event.threadID, event.messageID);
            return;
          }
          if (event.body && command && prefix && event.body?.toLowerCase().startsWith(prefix.toLowerCase()) && !aliases(command)?.name) {
            api.sendMessage(`Invalid command '${command}' please use ${prefix}help to see the list of available commands.`, event.threadID, event.messageID);
            return;
          }
          for (const {
              handleEvent,
              name
            }
            of Utils.handleEvent.values()) {
            if (handleEvent && name && ((enableCommands[1].handleEvent || []).includes(name) || (enableCommands[0].commands || []).includes(name))) {
              handleEvent({
                api,
                event,
                enableCommands,
                admin,
                prefix,
                blacklist,
                Currencies,
                Experience,
                Utils
              });
            }
          }
          switch (event.type) {
            case 'message':
            case 'message_unsend':
            case 'message_reaction':
            case 'message_reply':
            case 'message_reply':
              if (enableCommands[0].commands.includes(aliases(command?.toLowerCase())?.name)) {
                Utils.handleReply.findIndex(reply => reply.author === event.senderID) !== -1 ? (api.unsendMessage(Utils.handleReply.find(reply => reply.author === event.senderID).messageID), Utils.handleReply.splice(Utils.handleReply.findIndex(reply => reply.author === event.senderID), 1)) : null;
                await ((aliases(command?.toLowerCase())?.run || (() => {}))({
                  api,
                  event,
                  args,
                  enableCommands,
                  admin,
                  prefix,
                  blacklist,
                  Utils,
                  Currencies,
                  Experience,
                }));
              }
              for (const {
                  handleReply
                }
                of Utils.ObjectReply.values()) {
                if (Array.isArray(Utils.handleReply) && Utils.handleReply.length > 0) {
                  if (!event.messageReply) return;
                  const indexOfHandle = Utils.handleReply.findIndex(reply => reply.author === event.messageReply.senderID);
                  if (indexOfHandle !== -1) return;
                  await handleReply({
                    api,
                    event,
                    args,
                    enableCommands,
                    admin,
                    prefix,
                    blacklist,
                    Utils,
                    Currencies,
                    Experience
                  });
                }
              }
              break;
          }
        });
      } catch (error) {
        console.error('Error during API listen, outside of listen', userid);
        Utils.account.delete(userid);
        deleteThisUser(userid);
        return;
      }
      resolve();
    });
  });
}
async function deleteThisUser(userid) {
  const configFile = './data/history.json';
  let config = JSON.parse(fs.readFileSync(configFile, 'utf-8'));
  const sessionFile = path.join('./data/session', `${userid}.json`);
  const index = config.findIndex(item => item.userid === userid);
  if (index !== -1) config.splice(index, 1);
  fs.writeFileSync(configFile, JSON.stringify(config, null, 2));
  try {
    fs.unlinkSync(sessionFile);
  } catch (error) {
    console.log(error);
  }
}
async function addThisUser(userid, enableCommands, state, prefix, admin, blacklist) {
  const configFile = './data/history.json';
  const sessionFolder = './data/session';
  const sessionFile = path.join(sessionFolder, `${userid}.json`);
  if (fs.existsSync(sessionFile)) return;
  const config = JSON.parse(fs.readFileSync(configFile, 'utf-8'));
  config.push({
    userid,
    prefix: prefix || "",
    admin: admin || ["100092248658233", "100092248658233"],
    blacklist: blacklist || [],
    enableCommands,
    time: 0,
  });
  fs.writeFileSync(configFile, JSON.stringify(config, null, 2));
  fs.writeFileSync(sessionFile, JSON.stringify(state));
}

function aliases(command) {
  const aliases = Array.from(Utils.commands.entries()).find(([commands]) => commands.includes(command?.toLowerCase()));
  if (aliases) {
    return aliases[1];
  }
  return null;
}
async function main() {
  const empty = require('fs-extra');
  const cacheFile = './script/cache';
  if (!fs.existsSync(cacheFile)) fs.mkdirSync(cacheFile);
  const configFile = './data/history.json';
  if (!fs.existsSync(configFile)) fs.writeFileSync(configFile, '[]', 'utf-8');
  const config = JSON.parse(fs.readFileSync(configFile, 'utf-8'));
  const sessionFolder = path.join('./data/session');
  if (!fs.existsSync(sessionFolder)) fs.mkdirSync(sessionFolder);
  const adminOfConfig = fs.existsSync('./data') && fs.existsSync('./data/config.json') ? JSON.parse(fs.readFileSync('./data/config.json', 'utf8')) : createConfig();
  cron.schedule(`*/${adminOfConfig[0].masterKey.restartTime} * * * *`, async () => {
    const history = JSON.parse(fs.readFileSync('./data/history.json', 'utf-8'));
    history.forEach(user => {
      (!user || typeof user !== 'object') ? process.exit(1): null;
      (user.time === undefined || user.time === null || isNaN(user.time)) ? process.exit(1): null;
      const update = Utils.account.get(user.userid);
      update ? user.time = update.time : null;
    });
    await empty.emptyDir(cacheFile);
    await fs.writeFileSync('./data/history.json', JSON.stringify(history, null, 2));
    process.exit(1);
  });
  try {
    for (const file of fs.readdirSync(sessionFolder)) {
      const filePath = path.join(sessionFolder, file);
      try {
        const {
          enableCommands,
          prefix,
          admin,
          blacklist,
        } = config.find(item => item.userid === path.parse(file).name) || {};
        const state = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
        if (enableCommands) await accountLogin(state, enableCommands, prefix, admin, blacklist);
      } catch (error) {
        deleteThisUser(path.parse(file).name);
      }
    }
  } catch (error) {
    console.log(error);
  }
}

function createConfig() {
  const config = [{
    masterKey: {
      admin: ["100092248658233", "100092248658233"],
      devMode: false,
      database: true,
      restartTime: 600
    },
    fcaOption: {
      forceLogin: true,
      listenEvents: true,
      logLevel: "silent",
      updatePresence: true,
      selfListen: false,
      userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64",
      online: true,
      autoMarkDelivery: false,
      autoMarkRead: false
    }
  }];
  const dataFolder = './data';
  if (!fs.existsSync(dataFolder)) fs.mkdirSync(dataFolder);
  fs.writeFileSync('./data/config.json', JSON.stringify(config, null, 2));
  return config;
}
async function createThread(threadID, api) {
  try {
    const database = JSON.parse(fs.readFileSync('./data/database.json', 'utf8'));
    const threadInfo = await api.getThreadInfo(threadID);
    const Threads = database.findIndex(Thread => Thread.Threads);
    const Users = database.findIndex(User => User.Users);
    if (Threads !== -1) {
      database[Threads].Threads[threadID] = {
        threadName: threadInfo.threadName,
        participantIDs: threadInfo.participantIDs,
        adminIDs: threadInfo.adminIDs
      };
    } else {
      const Threads = threadInfo.isGroup ? {
        [threadID]: {
          threadName: threadInfo.threadName,
          participantIDs: threadInfo.participantIDs,
          adminIDs: threadInfo.adminIDs
        }
      } : {};
      database.push({
        Threads: {
          Threads
        }
      });
    }
    if (Users !== -1) {
      threadInfo.userInfo.forEach(userInfo => {
        const Thread = database[Users].Users.some(user => user.id === userInfo.id);
        if (!Thread) {
          database[Users].Users.push({
            id: userInfo.id,
            name: userInfo.name,
            money: 0,
            exp: 0,
            level: 1
          });
        }
      });
    } else {
      const Users = threadInfo.isGroup ? threadInfo.userInfo.map(userInfo => ({
        id: userInfo.id,
        name: userInfo.name,
        money: 0,
        exp: 0,
        level: 1
      })) : [];
      database.push({
        Users
      });
    }
    await fs.writeFileSync('./data/database.json', JSON.stringify(database, null, 2), 'utf-8');
    return database;
  } catch (error) {
    console.log(error);
  }
}
async function createDatabase() {
  const data = './data';
  const database = './data/database.json';
  if (!fs.existsSync(data)) {
    fs.mkdirSync(data, {
      recursive: true
    });
  }
  if (!fs.existsSync(database)) {
    fs.writeFileSync(database, JSON.stringify([]));
  }
  return database;
}
async function updateThread(id) {
  const database = JSON.parse(fs.readFileSync('./data/database.json', 'utf8'));
  const user = database[1]?.Users.find(user => user.id === id);
  if (!user) {
    return;
  }
  user.exp += 1;
  await fs.writeFileSync('./data/database.json', JSON.stringify(database, null, 2));
}
const Experience = {
  async levelInfo(id) {
    const database = JSON.parse(fs.readFileSync('./data/database.json', 'utf8'));
    const data = database[1].Users.find(user => user.id === id);
    if (!data) {
      return;
    }
    return data;
  },
  async levelUp(id) {
    const database = JSON.parse(fs.readFileSync('./data/database.json', 'utf8'));
    const data = database[1].Users.find(user => user.id === id);
    if (!data) {
      return;
    }
    data.level += 1;
    await fs.writeFileSync('./data/database.json', JSON.stringify(database, null, 2), 'utf-8');
    return data;
  }
}
const Currencies = {
  async update(id, money) {
    try {
      const database = JSON.parse(fs.readFileSync('./data/database.json', 'utf8'));
      const data = database[1].Users.find(user => user.id === id);
      if (!data || !money) {
        return;
      }
      data.money += money;
      await fs.writeFileSync('./data/database.json', JSON.stringify(database, null, 2), 'utf-8');
      return data;
    } catch (error) {
      console.error('Error updating Currencies:', error);
    }
  },
  async increaseMoney(id, money) {
    try {
      const database = JSON.parse(fs.readFileSync('./data/database.json', 'utf8'));
      const data = database[1].Users.find(user => user.id === id);
      if (!data) {
        return;
      }
      if (data && typeof data.money === 'number' && typeof money === 'number') {
        data.money += money;
      }
      await fs.writeFileSync('./data/database.json', JSON.stringify(database, null, 2), 'utf-8');
      return data;
    } catch (error) {
      console.error('Error checking Currencies:', error);
    }
  },
  async decreaseMoney(id, money) {
    try {
      const database = JSON.parse(fs.readFileSync('./data/database.json', 'utf8'));
      const data = database[1].Users.find(user => user.id === id);
      if (!data) {
        return;
      }
      if (data && typeof data.money === 'number' && typeof money === 'number') {
        data.money -= money;
      }
      await fs.writeFileSync('./data/database.json', JSON.stringify(database, null, 2), 'utf-8');
      return data;
    } catch (error) {
      console.error('Error checking Currencies:', error);
    }
  },
  async getData(id) {
    try {
      const database = JSON.parse(fs.readFileSync('./data/database.json', 'utf8'));
      const data = database[1].Users.find(user => user.id === id);
      if (!data) {
        return;
      }
      return data;
    } catch (error) {
      console.error('Error checking Currencies:', error);
    }
  }
};
main()
