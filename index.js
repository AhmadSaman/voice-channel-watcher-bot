require("dotenv").config();
const {
  Client,
  GatewayIntentBits,
  SlashCommandBuilder,
  ChannelType,
  REST,
  Routes,
} = require("discord.js");
const Database = require("better-sqlite3");

const db = new Database("servers.db");

db.prepare(
  `
  CREATE TABLE IF NOT EXISTS servers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    server_id TEXT UNIQUE,
    channel_id TEXT
  )
`
).run();

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildVoiceStates],
});

client.login(process.env.DISCORD_TOKEN).catch(console.error);

client.once("ready", async () => {
  console.log(`✅ Logged in as ${client.user.tag}`);

  const rest = new REST({ version: "10" }).setToken(process.env.DISCORD_TOKEN);
  try {
    await rest.put(Routes.applicationCommands(client.user.id), {
      body: commands,
    });
    console.log("✅ Slash command registered");
  } catch (error) {
    console.error("❌ Failed to register command:", error);
  }
});

const commands = [
  new SlashCommandBuilder()
    .setName("setlogchannel")
    .setDescription("Set the text channel to log voice join events")
    .addChannelOption((option) =>
      option
        .setName("channel")
        .setDescription("The text channel to send logs to")
        .addChannelTypes(ChannelType.GuildText)
        .setRequired(true)
    )
    .toJSON(),
];

client.on("interactionCreate", async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  if (interaction.commandName === "setlogchannel") {
    const channel = interaction.options.getChannel("channel");

    const upsert = db.prepare(
      `INSERT INTO servers (server_id, channel_id)
       VALUES (?, ?)
       ON CONFLICT(server_id) DO UPDATE SET channel_id=excluded.channel_id`
    );
    upsert.run(interaction.guildId, channel.id);
    await interaction.reply(
      `✅ Voice join logs will be sent to <#${channel.id}>.`
    );
  }
});

client.on("voiceStateUpdate", (oldState, newState) => {
  const user = newState.member?.user || oldState.member?.user;
  const joinedChannel = newState.channel;

  if (!oldState.channel && newState.channel) {
    console.log(`${user.tag} joined ${joinedChannel.name}`);

    const row = db
      .prepare("SELECT channel_id FROM servers WHERE server_id = ?")
      .get(newState.guild.id);
    const textChannel = row
      ? newState.guild.channels.cache.get(row.channel_id)
      : null;
    if (textChannel) {
      textChannel.send(
        `🔔 <@${newState.member.id}> joined **${newState.channel.name}**`
      );
    }
  }
});
