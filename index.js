require("dotenv").config();
const { Client, GatewayIntentBits } = require("discord.js");

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildVoiceStates],
});

client.login(process.env.DISCORD_TOKEN).catch(console.error);

client.on("ready", () => {
  console.log(`✅ Logged in as ${client.user.tag}`);
});

client.on("voiceStateUpdate", (oldState, newState) => {
  const user = newState.member?.user || oldState.member?.user;
  const joinedChannel = newState.channel;

  if (!oldState.channel && newState.channel) {
    console.log(`${user.tag} joined ${joinedChannel.name}`);

    const textChannel = newState.guild.channels.cache.find(
      (channel) => channel.name === "voice-channel-watcher"
    );
    if (textChannel) {
      textChannel.send(`

        **${user.tag}** joined **${joinedChannel.name}**
        `);
    }
  }
});
