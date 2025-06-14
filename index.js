import { Client, GatewayIntentBits, SlashCommandBuilder, Routes, EmbedBuilder } from 'discord.js';
// ... reszta importów i kodu bez zmian

// Dodaj dwie nowe komendy do tablicy commands:
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

// Funkcja do usuwania punktów (odejmowania), która nie pozwoli zejść poniżej 0:
function removePoints(userId, type, count) {
  const data = loadData();
  if (!data[userId]) data[userId] = { plusy: 0, minusy: 0 };
  data[userId][type] = Math.max(0, data[userId][type] - count);
  saveData(data);
}

// W event handlerze interactionCreate dodaj obsługę nowych komend i ładny embed dla /mojewyniki:
client.on('interactionCreate', async interaction => {
  if (!interaction.isChatInputCommand()) return;

  const { commandName } = interaction;

  if (commandName === 'dodajplus') {
    const user = interaction.options.getUser('uzytkownik');
    const count = interaction.options.getInteger('ilosc');
    addPoints(user.id, 'plusy', count);
    await interaction.reply(`${user.username} dostał(a) ${count} plusa(ów)!`);
  }

  else if (commandName === 'dodajminus') {
    const user = interaction.options.getUser('uzytkownik');
    const count = interaction.options.getInteger('ilosc');
    addPoints(user.id, 'minusy', count);
    await interaction.reply(`${user.username} dostał(a) ${count} minusa(ów)!`);
  }

  else if (commandName === 'usunplus') {
    const user = interaction.options.getUser('uzytkownik');
    const count = interaction.options.getInteger('ilosc');
    removePoints(user.id, 'plusy', count);
    await interaction.reply(`Usunięto ${count} plusa(ów) użytkownikowi ${user.username}.`);
  }

  else if (commandName === 'usunminus') {
    const user = interaction.options.getUser('uzytkownik');
    const count = interaction.options.getInteger('ilosc');
    removePoints(user.id, 'minusy', count);
    await interaction.reply(`Usunięto ${count} minusa(ów) użytkownikowi ${user.username}.`);
  }

  else if (commandName === 'mojewyniki') {
    const userId = interaction.user.id;
    const { plusy, minusy } = getUserPoints(userId);
    const embed = new EmbedBuilder()
      .setColor('#00FF00')
      .setTitle(`Wyniki użytkownika ${interaction.user.username}`)
      .addFields(
        { name: '➕ Plusy', value: plusy.toString(), inline: true },
        { name: '➖ Minusy', value: minusy.toString(), inline: true },
        { name: '💯 Różnica', value: (plusy - minusy).toString(), inline: true }
      )
      .setFooter({ text: 'Twoje plusy i minusy' })
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  }

  else if (commandName === 'ranking') {
    const ranking = getRanking();
    let msg = '**📊 Ranking użytkowników:**\n';
    for (let [id, data] of ranking) {
      const user = await client.users.fetch(id);
      msg += `**${user.username}** — ➕ ${data.plusy} / ➖ ${data.minusy}\n`;
    }
    await interaction.reply(msg);
  }
});
