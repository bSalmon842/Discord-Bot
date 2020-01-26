const fs = require("fs");
const Discord = require("discord.js");
const prefix = require("../config.json").prefix;

var currectConnectionTime = new Array();
var totalConnectionTime = new Array();
var userChatMessages = new Array();

const currectConnectionTimeFile = "../currentConnectionFile.json";
const totalConnectionTimeFile = "../totalConnectionTimeFile.json";
const userChatMessagesFile = "../userChatMessagesFile.json";

module.exports = {
  listen: function(client) {
    loadCurrentConnectionFile();
    loadTotalConnectionTimeFile();
    loadUserChatMessagesFile();
    //Listen for stats commands
    client.on("message", message => {
      if (message.content.charAt(0) == prefix) {
        var msg = message.content.substring(1);

        splitCommands = msg.split(" ");

        if (splitCommands[0] == "stats") {
          if (splitCommands[1] == "current") {
            var messageSent = false;
            currectConnectionTime.forEach(obj => {
              if (obj.userid === message.member.id) {
                connectionLength = getReadableConnectedTime(obj.joinTime);
                message.reply(
                  "You have been connected to this session for " +
                  connectionLength
                );
                messageSent = true;
              }
            });
            if(!messageSent) message.reply("Your arent connected");
          } else if (splitCommands[1] == "total") {
            totalConnectionTime.forEach(obj => {
              if (obj.userid === message.member.id) {
                var currentConnectedTime = 0;
                currectConnectionTime.forEach(currentObj => {
                  if (currentObj.userid === obj.userid) {
                    var date = new Date();
                    var currentTime = date.getTime();
                    currentConnectedTime = currentTime - currentObj.joinTime;
                  }
                });
                var totalConnectionTime =
                parseInt(currentConnectedTime) + parseInt(obj.totalTime);
                var readableTotalConnectionTime = parseMillisecondsIntoReadableTime(
                  totalConnectionTime
                );

                message.reply(
                  "You have been connected for a total of " +
                  readableTotalConnectionTime
                );
              }
            });
          } else if (splitCommands[1] == "leaderboard") {
            const leaderboardEmbed = new Discord.MessageEmbed()
            .setTitle("Leaderboard")
            .setColor("#0099ff");

            leaderboardLength = 10;
            if(splitCommands[2] != null && Number.isInteger(parseInt(splitCommands[2]))){
              leaderboardLength = parseInt(splitCommands[2]);
            }

            //make temp array with totals including current connected time
            var leaderboardArray = new Array();

            totalConnectionTime.forEach(obj => {
              var currentConnectedTime = 0;
              currectConnectionTime.forEach(currentObj => {
                if (currentObj.userid === obj.userid) {
                  var date = new Date();
                  var currentTime = date.getTime();
                  currentConnectedTime = currentTime - currentObj.joinTime;
                }
              });

              var totalConnectionTime;
              if (currentConnectedTime !== 0) {
                totalConnectionTime =
                parseInt(currentConnectedTime) + parseInt(obj.totalTime);
              } else {
                totalConnectionTime = parseInt(obj.totalTime);
              }
              var user = { userid: obj.userid, totalTime: totalConnectionTime };

              leaderboardArray.push(user);
            });

            //sort array by length
            leaderboardArray.sort(function(a, b) {
              if (a.totalTime > b.totalTime) {
                return -1;
              }
              if (a.totalTime < b.totalTime) {
                return 1;
              }
              return 0;
            });

            var leaderboardMessage = "";
            for (let i = 0; i < leaderboardArray.length; i++) {
              var readableTotalConnectionTime = parseMillisecondsIntoReadableTime(
                leaderboardArray[i].totalTime
              );
              var userName = "";
              try {
                userName = message.guild.member(leaderboardArray[i].userid)
                .displayName;
              } catch (e) {
                console.log(e);
              }

              if (i <= (leaderboardLength - 1)) {
                leaderboardMessage += "```";
                leaderboardMessage +=
                "#" +
                (i + 1) +
                " " +
                userName +
                " " +
                readableTotalConnectionTime;
                leaderboardMessage += "```";
              }
            }
            leaderboardEmbed.setDescription(leaderboardMessage);
            message.channel.send(leaderboardEmbed);
          }
        }
      }
    });

    //listen for client join/disconnect
    client.on("voiceStateUpdate", (oldMember, newMember) => {
      let newUserChannel = newMember.channel;
      let oldUserChannel = oldMember.channel;
      let afkChannel = newMember.guild.afkChannel;

      //User joins server
      if (
        (oldUserChannel === null && newUserChannel !== null) ||
        (oldUserChannel === afkChannel && newUserChannel !== null)
      ) {
        if (newUserChannel !== afkChannel) {
          var date = new Date();
          var currentTime = date.getTime();
          var connectingUser = { userid: newMember.id, joinTime: currentTime };

          currectConnectionTime.push(connectingUser);
          saveCurrentConnectionFile();
        }
      }
      //User leaves server
      else if (newUserChannel === null || newUserChannel === afkChannel) {
        for (let i = 0; i < currectConnectionTime.length; i++) {
          if (currectConnectionTime[i].userid === newMember.id) {
            var date = new Date();
            var currentTime = date.getTime();
            var connectedTime = currentTime - currectConnectionTime[i].joinTime;
            var user = { userid: newMember.id, totalTime: connectedTime };
            var updated = false;
            totalConnectionTime.forEach(obj => {
              if (obj.userid === newMember.id) {
                obj.totalTime += connectedTime;
                updated = true;
              }
            });
            if (!updated) {
              totalConnectionTime.push(user);
            }
            saveTotalConnectionTimeFile();

            currectConnectionTime.splice(i, 1);
            saveCurrentConnectionFile();
          }
        }
      }
    });

    //Listen for chat messages to be recorded as stats
    client.on("message", message => {
      if(!message.author.bot && message.content.charAt(0) != prefix){
        var updated = false;
        for (let i = 0; i < userChatMessages.length; i++) {
          if(userChatMessages[i].userid === message.author.id){
            userChatMessages[i].messages += 1;
            updated = true;
          }
        }
        if(!updated){
          var user = { userid: message.author.id, messages: 1 };
          userChatMessages.push(user);
        }
        saveUserChatMessagesFile();
      }
    });
  },
  destroy: function() {
    saveTotalConnectionTimeFile();
    saveCurrentConnectionFile();
    saveUserChatMessagesFile();
  }
};

function getReadableConnectedTime(joinTime) {
  var date = new Date();
  var currentTime = date.getTime();

  var millisec = currentTime - joinTime;
  return parseMillisecondsIntoReadableTime(millisec);
}

function parseMillisecondsIntoReadableTime(millisec) {
  var seconds = (millisec / 1000).toFixed(0);
  var minutes = Math.floor(seconds / 60);
  var hours = "";
  if (minutes > 59) {
    hours = Math.floor(minutes / 60);
    hours = hours >= 10 ? hours : "0" + hours;
    minutes = minutes - hours * 60;
    minutes = minutes >= 10 ? minutes : "0" + minutes;
  }

  seconds = Math.floor(seconds % 60);
  seconds = seconds >= 10 ? seconds : "0" + seconds;
  if (hours != "") {
    return hours + ":" + minutes + ":" + seconds;
  }
  return minutes + ":" + seconds;
}

function loadCurrentConnectionFile() {
  if (fs.existsSync(currectConnectionTimeFile)) {
    var rawdata = fs.readFileSync(currectConnectionTimeFile, function(
      err,
      data
    ) {});

    if (rawdata != null) {
      currectConnectionTime = JSON.parse(rawdata);
    }
  }
}

function loadTotalConnectionTimeFile() {
  if (fs.existsSync(totalConnectionTimeFile)) {
    var rawdata = fs.readFileSync(totalConnectionTimeFile, function(
      err,
      data
    ) {});

    if (rawdata != null) {
      totalConnectionTime = JSON.parse(rawdata);
    }
  }
}

function loadUserChatMessagesFile(){
  if (fs.existsSync(userChatMessagesFile)) {
    var rawdata = fs.readFileSync(userChatMessagesFile, function(
      err,
      data
    ) {});

    if (rawdata != null) {
      userChatMessages = JSON.parse(rawdata);
    }
  }
}

function saveUserChatMessagesFile(){
  fs.writeFileSync(
    userChatMessagesFile,
    JSON.stringify(userChatMessages),
    function(err) {
      if (err) throw err;
    }
  );
}

function saveTotalConnectionTimeFile() {
  fs.writeFileSync(
    totalConnectionTimeFile,
    JSON.stringify(totalConnectionTime),
    function(err) {
      if (err) throw err;
    }
  );
}

function saveCurrentConnectionFile() {
  fs.writeFileSync(
    currectConnectionTimeFile,
    JSON.stringify(currectConnectionTime),
    function(err) {
      if (err) throw err;
    }
  );
}
