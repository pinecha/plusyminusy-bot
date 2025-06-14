import { Client, GatewayIntentBits, SlashCommandBuilder, Routes, PermissionFlagsBits } from 'discord.js';
import { REST } from '@discordjs/rest';
import fs from 'fs';

const TOKEN = process.env.TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;
const GUILD_ID = process.env.GUILD_ID;

const client = new Client({ intents: [GatewayIntentBits.Guilds] });
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
  saveData(data);
}

function removePoints(userId, type, count) {
  const data = loadData();
  if (!data[userId]) data[userId] = { plusy: 0, minusy: 0 };
  data[userId][type] = Math.max(0, data[userId][type] - count);
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

// Komendy
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
    .setDescription('Pokazuje ranking wszystkich')
].map(cmd => cmd.toJSON());

const rest = new REST({ version: '10' }).setToken(TOKEN);
await rest.put(Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID), { body: commands });

client.on('ready', () => {
  console.log(`✅ Bot zalogowany jako ${client.user.tag}`);
});

client.on('interactionCreate', async interaction => {
  if (!interaction.isChatInputCommand()) return;
  const { commandName } = interaction;

  // Funkcja pomocnicza do sprawdzania uprawnień admina
  const isAdmin = interaction.memberPermissions?.has(PermissionFlagsBits.Administrator);

  // Komendy tylko dla administratorów
  if (['dodajplus', 'dodajminus', 'usunplus', 'usunminus'].includes(commandName)) {
    if (!isAdmin) {
      return interaction.reply({ content: '⛔ Nie masz uprawnień do użycia tej komendy (wymagany Administrator).', ephemeral: true });
    }
  }

  if (commandName === 'dodajplus') {
    const user = interaction.options.getUser('uzytkownik');
    const count = interaction.options.getInteger('ilosc');
    addPoints(user.id, 'plusy', count);
    await interaction.reply(`${user.username} dostał(a) ${count} plusa(ów)!`);
  }

  if (commandName === 'dodajminus') {
    const user = interaction.options.getUser('uzytkownik');
    const count = interaction.options.getInteger('ilosc');
    addPoints(user.id, 'minusy', count);
    await interaction.reply(`${user.username} dostał(a) ${count} minusa(ów)!`);
  }

  if (commandName === 'usunplus') {
    const user = interaction.options.getUser('uzytkownik');
    const count = interaction.options.getInteger('ilosc');
    removePoints(user.id, 'plusy', count);
    await interaction.reply(`${user.username} miał(a) usunięte ${count} plusa(ów)!`);
  }

  if (commandName === 'usunminus') {
    const user = interaction.options.getUser('uzytkownik');
    const count = interaction.options.getInteger('ilosc');
    removePoints(user.id, 'minusy', count);
    await interaction.reply(`${user.username} miał(a) usunięte ${count} minusa(ów)!`);
  }

  if (commandName === 'mojewyniki') {
    const userId = interaction.user.id;
    const { plusy, minusy } = getUserPoints(userId);
    await interaction.reply(`Masz ➕ ${plusy} plusów i ➖ ${minusy} minusów.`);
  }

  if (commandName === 'ranking') {
    const ranking = getRanking();
    let msg = '**📊 Ranking użytkowników:**\n';
    for (let [id, data] of ranking) {
      try {
        const user = await client.users.fetch(id);
        msg += `**${user.username}** — ➕ ${data.plusy} / ➖ ${data.minusy}\n`;
      } catch {
        msg += `**Nieznany użytkownik** — ➕ ${data.plusy} / ➖ ${data.minusy}\n`;
      }
    }
    await interaction.reply(msg);
  }
});

client.login(TOKEN);
