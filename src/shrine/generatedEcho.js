// src/commands/echoTest.js
const { SlashCommandBuilder } = require('@discordjs/builders');
const generateEcho = require('../shrine/generateEcho');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('echoTest')
    .setDescription('Test shrine echo payload'),
  
  async execute(interaction) {
    // Customize these values to simulate a real sponsor event
    const payload = generateEcho({
      sponsorName: 'TestSponsor',
      tier:        'Bronze',
      badgeDelta:  +2
    });

    // Post the human-readable echo into Discord
    await interaction.reply(payload.message);

    // Log full payload for audit or shrine-channel relay
    console.log('🔔 Shrine Echo Payload:', payload);
  }
};
