const Discord = require('discord.js');
const client = new Discord.Client();

const intros = require('./intros.json').intros;
const exits = require('./exits.json').exits;
var commands = require('./chatcommands.json').commands;
const prefix = require('./chatcommands.json').prefix;
var sound = require('./soundcommands.json').commands;

soundPlaying = false;

client.on('ready', () => {
});

//Detect if user joins voice channel
const cooldown = 300000;
var lastUsedIntroArray = new Array();
var lastUsedExitArray = new Array();

sound.sort(function(a, b){
  if(a.command < b.command) { return -1; }
  if(a.command > b.command) { return 1; }
  return 0;
})

commands.sort(function(a, b){
  if(a.command < b.command) { return -1; }
  if(a.command > b.command) { return 1; }
  return 0;
})


client.on('voiceStateUpdate', (oldMember, newMember) => {
  let newUserChannel = newMember.channel;
  let oldUserChannel = oldMember.channel;

  var channel = newMember.guild.channels.find(ch => ch.name === 'general-chat');
  if (!channel) return;

  if(oldUserChannel === null && newUserChannel !== null) {
    // User Joins a voice channel
    var user = newMember;
    intros.forEach(obj => {
      if(user.id == obj.userid){
        console.log(user.id);
        var date = new Date();
        var currentTime = date.getTime();
        var lastUsedUser = {userid:user.id, usedTime:currentTime};

        //check if there is already an entry
        if(lastUsedIntroArray.some(lastUser => lastUser.userid === user.id)){
          //get the lastUser object
          var index;
          lastUsedIntroArray.some(function(entry, i) {
            if (entry.userid === user.id) {
              index = i;
              return true;
            }
          });

          //check if the cooldown time has passed
          if(currentTime > lastUsedIntroArray[index].usedTime + cooldown){
            //post gif and update entry in array
            channel.send(obj.link);
            lastUsedIntroArray[index].usedTime = currentTime;
          }
        } else{
          //post gif
          channel.send(obj.link);
          //add entry to lastUsedIntroArray
          lastUsedIntroArray.push(lastUsedUser);
        }
      }
    });

  } else if(newUserChannel === null){
    // User leaves a voice channel

    var user = newMember;
    exits.forEach(obj => {
      if(user.id == obj.userid){
        var date = new Date();
        var currentTime = date.getTime();
        var lastUsedUser = {userid:user.id, usedTime:currentTime};

        //check if there is already an entry
        if(lastUsedExitArray.some(lastUser => lastUser.userid === user.id)){
          //get the lastUser object
          var index;
          lastUsedExitArray.some(function(entry, i) {
            if (entry.userid === user.id) {
              index = i;
              return true;
            }
          });

          //check if the cooldown time has passed
          if(currentTime > lastUsedExitArray[index].usedTime + cooldown){
            //post gif and update entry in array
            channel.send(obj.link);
            lastUsedExitArray[index].usedTime = currentTime;
          }
        } else{
          //post gif
          channel.send(obj.link);
          //add entry to lastUsedExitArray
          lastUsedExitArray.push(lastUsedUser);
        }
      }
    });
  }
})

// Listen for commands
client.on('message', message => {
  if(message.content.charAt(0) == prefix){
    var msg = message.content.substring(1);
    if(msg == "help"){

      var soundsMessage = "";
      sound.forEach((obj, key) => {
        soundsMessage += "`"+prefix+obj.command+"` ";
      });

      var gifMessage = "";
      commands.forEach((obj, key) => {
        gifMessage += "`"+prefix+obj.command+"` ";
      });

      const helpEmbed = new Discord.MessageEmbed()
      .setColor('#0099ff')
      .addField(':loud_sound:', soundsMessage)
      .addField(':tv: ', gifMessage)

      message.channel.send(helpEmbed);
    }

    //gif commands
    commands.forEach(obj => {
      if(msg == obj.command){
        message.channel.send(obj.link);
      }
    });

    //sound clip chatcommands
    sound.forEach(obj => {
      if(msg == obj.command){
        var voiceChannel = message.member.voice.channel;
        if(voiceChannel != undefined){
          if(!soundPlaying){
            soundPlaying = true;
            voiceChannel.join().then(connection => {
              const dispatcher = connection.play(obj.file);
              dispatcher.on('end', end => voiceChannel.leave());
              dispatcher.on('end', end => soundPlaying = false);
              dispatcher.on('end', end => message.delete(1000));
            }).catch(err => console.log(err))
          }
          else{
            message.delete(1000);
          }
        }
      }
    });
  }
});

client.login(process.env.TOKEN);
