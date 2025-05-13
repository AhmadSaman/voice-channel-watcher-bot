require("dotenv").config();
const {
  Client,
  GatewayIntentBits,
  SlashCommandBuilder,
  ChannelType,
  REST,
  Routes,
} = require("discord.js");
const mongoose = require("mongoose");

async function connectToDatabase() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("✅ Connected to MongoDB");
  } catch (error) {
    console.error("❌ MongoDB connection error:", error);
    process.exit(1);
  }
}
connectToDatabase();

const serverSchema = new mongoose.Schema({
  guildId: { type: Number, required: true },
  channelId: { type: Number, required: true },
});

model = mongoose.model("Server", serverSchema);

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildVoiceStates],
});

client.login(process.env.DISCORD_TOKEN).catch(console.error);

// register slash commands
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

// define commands
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

// command listener
client.on("interactionCreate", async (interaction) => {
  if (!interaction.isChatInputCommand()) return;
  if (interaction.commandName === "setlogchannel") {
    const channel = interaction.options.getChannel("channel");
    await model.findOneAndUpdate(
      { guildId: interaction.guildId },
      { guildId: interaction.guildId, channelId: channel.id },
      { upsert: true, new: true }
    );
  }
});

// For listening to voice state updates
client.on("voiceStateUpdate", async (oldState, newState) => {
  const user = newState.member?.user || oldState.member?.user;
  const joinedChannel = newState.channel;

  if (!oldState.channel && newState.channel) {
    console.log(`${user.tag} joined ${joinedChannel.name}`);

    const doc = await model.findOne({ guildId: newState.guild.id });
    const textChannel = doc
      ? newState.guild.channels.cache.get(doc.channel_id)
      : null;
    if (textChannel) {
      textChannel.send(
        `🔔 <@${newState.member.id}> joined **${newState.channel.name}**`
      );
    }
  }
});
