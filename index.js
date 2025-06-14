import { Client, GatewayIntentBits, SlashCommandBuilder, Routes, EmbedBuilder } from 'discord.js';
import { REST } from '@discordjs/rest';
import fs from 'fs';

const TOKEN = process.env.TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;
const GUILD_ID = process.env.GUILD_ID;

const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers] });
const dbPath = './data.json';

function loadData() {
  if (!fs.existsSync(dbPath)) return {};
  return JSON.parse(fs.readFileSync(dbPath, 'utf8'));
}

function saveData(data) {
  fs.writeFileSync(dbPath, JSON.stringify(data, null, 2));
}

function addPoints(userId, type, count) {
  const data = loadData();
  if (!data[userId]) data[userId] = { plusy: 0, minusy: 0 };
  data[userId][type] += count;
  if (data[userId][type] < 0) data[userId][type] = 0; // nie pozwalamy na ujemne punkty
  saveData(data);
}

function getUserPoints(userId) {
  const data = loadData();
  return data[userId] || { plusy: 0, minusy: 0 };
}

function getRanking() {
  const data = loadData();
  return Object.entries(data).sort((a, b) => (b[1].plusy - b[1].minusy) - (a[1].plusy - a[1].minusy));
}

// Rangi i wymagania
const ranks = [
  { name: 'Enforcer Scout', id: '1382824839617839273', requiredPoints: 4, previousId: '1382824839617839272' },
  { name: 'Junior Enforcer', id: '1382824839617839274', requiredPoints: 5, previousId: '1382824839617839273' },
  { name: 'Full Enforcer', id: '1382824839634485360', requiredPoints: 5, previousId: '1382824839617839274' },
  { name: 'Senior Enforcer', id: '1382824839634485361', requiredPoints: 5, previousId: '1382824839634485360' },
  { name: 'Shadow Enforcer', id: '1382824839634485362', requiredPoints: 6, previousId: '1382824839634485361' },
  { name: 'Battle Enforcer', id: '1382824839634485363', requiredPoints: 6, previousId: '1382824839634485362' },
  { name: 'Elite Enforcer', id: '1382824839634485364', requiredPoints: 6, previousId: '1382824839634485363' },
  { name: 'Night Agent', id: '1382824839634485365', requiredPoints: 7, previousId: '1382824839634485364' },
  { name: 'Black Fang', id: '1382824839634485366', requiredPoints: 9, previousId: '1382824839634485365' },
];

// Funkcja do nadawania rangi użytkownikowi na podstawie punktów
async function updateRanks(guild, member, plusy) {
  // Pomijamy Street Rat (id: 1382824839617839272) - nie zarządzamy tą rangą
  const streetRatId = '1382824839617839272';

  // Sprawdź, którą rangę użytkownik już ma
  const memberRoles = member.roles.cache;
  let currentRankIndex = -1;
  for (let i = ranks.length - 1; i >= 0; i--) {
    if (memberRoles.has(ranks[i].id)) {
      currentRankIndex = i;
      break;
    }
  }

  // Sprawdź najwyższą rangę, do której user ma prawo
  let newRankIndex = -1;
  for (let i = 0; i < ranks.length; i++) {
    const rank = ranks[i];
    // Sprawdź, czy ma poprzednią rangę (Street Rat jest pomijany w nadawaniu, ale wymagany)
    const hasPrevious = rank.previousId === streetRatId
      ? memberRoles.has(streetRatId)
      : memberRoles.has(rank.previousId);

    if (plusy >= rank.requiredPoints && hasPrevious) {
      newRankIndex = i;
    }
  }

  if (newRankIndex > currentRankIndex) {
    // Awans: dodaj nową rangę i usuń poprzednią
    const data = loadData();

    // Dodaj nową rangę
    await member.roles.add(ranks[newRankIndex].id);

    // Usuń poprzednią rangę (jeśli to nie Street Rat)
    if (currentRankIndex >= 0) {
      await member.roles.remove(ranks[currentRankIndex].id);
    }

    // Resetuj plusy do 0 po awansie
    if (data[member.id]) {
      data[member.id].plusy = 0;
      saveData(data);
    }

  } else if (newRankIndex < currentRankIndex) {
    // Spadek rangi (np. utrata plusów) - usuń wyższe rangi
    for (let i = newRankIndex + 1; i <= currentRankIndex; i++) {
      if (memberRoles.has(ranks[i].id)) {
        await member.roles.remove(ranks[i].id);
      }
    }
  }
}

// Komendy z dodanymi/usuniętymi plusami i sprawdzaniem rang
const commands = [
  new SlashCommandBuilder()
    .setName('dodajplus')
    .setDescription('Dodaje plusy użytkownikowi')
    .addUserOption(opt => opt.setName('uzytkownik').setDescription('Użytkownik').setRequired(true))
    .addIntegerOption(opt => opt.setName('ilosc').setDescription('Ilość plusów').setRequired(true)),

  new SlashCommandBuilder()
    .setName('dodajminus')
    .setDescription('Dodaje minusy użytkownikowi')
    .addUserOption(opt => opt.setName('uzytkownik').setDescription('Użytkownik').setRequired(true))
    .addIntegerOption(opt => opt.setName('ilosc').setDescription('Ilość minusów').setRequired(true)),

  new SlashCommandBuilder()
    .setName('usunplus')
    .setDescription('Usuwa plusy użytkownikowi')
    .addUserOption(opt => opt.setName('uzytkownik').setDescription('Użytkownik').setRequired(true))
    .addIntegerOption(opt => opt.setName('ilosc').setDescription('Ilość plusów do usunięcia').setRequired(true)),

  new SlashCommandBuilder()
    .setName('usunminus')
    .setDescription('Usuwa minusy użytkownikowi')
    .addUserOption(opt => opt.setName('uzytkownik').setDescription('Użytkownik').setRequired(true))
    .addIntegerOption(opt => opt.setName('ilosc').setDescription('Ilość minusów do usunięcia').setRequired(true)),

  new SlashCommandBuilder()
    .setName('mojewyniki')
    .setDescription('Pokazuje twoje plusy i minusy'),

  new SlashCommandBuilder()
    .setName('ranking')
    .setDescription('Pokazuje ranking wszystkich'),
].map(cmd => cmd.toJSON());

const rest = new REST({ version: '10' }).setToken(TOKEN);
await rest.put(Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID), { body: commands });

client.on('ready', () => {
  console.log(`✅ Bot zalogowany jako ${client.user.tag}`);
});

client.on('interactionCreate', async interaction => {
  if (!interaction.isChatInputCommand()) return;

  const { commandName } = interaction;
  const guild = interaction.guild;

  if (!guild) {
    await interaction.reply({ content: 'Ta komenda może być używana tylko na serwerze.', ephemeral: true });
    return;
  }

  if (commandName === 'dodajplus') {
    const user = interaction.options.getUser('uzytkownik');
    const count = interaction.options.getInteger('ilosc');
    addPoints(user.id, 'plusy', count);
    const guildMember = await guild.members.fetch(user.id);
    await updateRanks(guild, guildMember, getUserPoints(user.id).plusy);
    await interaction.reply(`${user.username} dostał(a) ${count} plusa(ów)!`);
  } else if (commandName === 'dodajminus') {
    const user = interaction.options.getUser('uzytkownik');
    const count = interaction.options.getInteger('ilosc');
    addPoints(user.id, 'minusy', count);
    await interaction.reply(`${user.username} dostał(a) ${count} minusa(ów)!`);
  } else if (commandName === 'usunplus
