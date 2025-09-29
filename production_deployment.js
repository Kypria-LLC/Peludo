// unified-revenue-server.js
// 🔱 Kypria Revenue Engine - Production Server

const express = require('express');
const bodyParser = require('body-parser');
const crypto = require('crypto');
const { Client, GatewayIntentBits, EmbedBuilder } = require('discord.js');
require('dotenv').config();

const app = express();
const client = new Client({ 
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers] 
});

// Middleware
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Discord client setup
client.login(process.env.DISCORD_TOKEN);

// Role mapping for revenue tiers
const ROLE_MAP = {
  bronze: process.env.PATREON_BRONZE_ROLE_ID,
  silver: process.env.PATREON_SILVER_ROLE_ID,
  gold: process.env.PATREON_GOLD_ROLE_ID
};

// Webhook signature verification
function verifyPatreonSignature(req, res, next) {
  const signature = req.headers['x-patreon-signature'];
  const body = JSON.stringify(req.body);
  const hash = crypto.createHmac('md5', process.env.PATREON_WEBHOOK_SECRET)
                    .update(body)
                    .digest('hex');

  if (signature !== hash) {
    console.warn('⚠️ Invalid Patreon signature');
    return res.status(401).send('Unauthorized');
  }
  next();
}

// Main Patreon webhook handler
app.post('/webhook/patreon', verifyPatreonSignature, async (req, res) => {
  try {
    const { data, included } = req.body;
    
    if (data.type === 'pledge' && data.attributes.declined_since === null) {
      const pledgeAmount = data.attributes.amount_cents / 100;
      const patronId = data.relationships.patron.data.id;
      
      // Find patron details
      const patron = included.find(item => 
        item.type === 'user' && item.id === patronId
      );
      
      const discordId = patron?.attributes?.social_connections?.discord?.user_id;
      
      if (discordId) {
        await processPatronPledge(discordId, pledgeAmount, patron.attributes.full_name);
      }
    }
    
    res.status(200).send('Webhook processed');
  } catch (error) {
    console.error('🔴 Webhook error:', error);
    res.status(500).send('Server error');
  }
});

// Process patron pledge and assign roles
async function processPatronPledge(discordId, amount, patronName) {
  try {
    const guild = await client.guilds.fetch(process.env.GUILD_ID);
    const member = await guild.members.fetch(discordId);
    
    // Determine tier based on amount
    let tier = 'bronze';
    if (amount >= 50) tier = 'gold';
    else if (amount >= 15) tier = 'silver';
    
    // Assign role
    const roleId = ROLE_MAP[tier];
    await member.roles.add(roleId, `Patreon pledge: $${amount}`);
    
    // Log to audit channel
    await logPatronActivity(discordId, patronName, tier, amount);
    
    // Generate and send artifact
    await sendArtifactDrop(discordId, tier);
    
    console.log(`✅ Processed pledge: ${patronName} ($${amount}) -> ${tier} tier`);
    
  } catch (error) {
    console.error('🔴 Error processing pledge:', error);
  }
}

// Log patron activity to Discord
async function logPatronActivity(discordId, patronName, tier, amount) {
  const logChannel = await client.channels.fetch(process.env.LOG_CHANNEL_ID);
  
  const embed = new EmbedBuilder()
    .setTitle('🔱 New Patron Blessing')
    .setDescription(`Patron **${patronName}** has joined the ${tier.toUpperCase()} tier`)
    .addFields([
      { name: 'Amount', value: `$${amount}`, inline: true },
      { name: 'Tier', value: tier.toUpperCase(), inline: true },
      { name: 'Discord', value: `<@${discordId}>`, inline: true }
    ])
    .setColor(tier === 'gold' ? '#FFD700' : tier === 'silver' ? '#C0C0C0' : '#CD7F32')
    .setTimestamp();
    
  await logChannel.send({ embeds: [embed] });
}

// Send artifact drop to patron
async function sendArtifactDrop(discordId, tier) {
  const artifacts = {
    bronze: 'https://cdn.kypria.com/artifacts/bronze-sigil.png',
    silver: 'https://cdn.kypria.com/artifacts/silver-tome.png',
    gold: 'https://cdn.kypria.com/artifacts/gold-crest.png'
  };
  
  try {
    const user = await client.users.fetch(discordId);
    const embed = new EmbedBuilder()
      .setTitle(`🎁 ${tier.toUpperCase()} Artifact Unlocked`)
      .setDescription(`Your support has awakened the ${tier} tier artifact!`)
      .setImage(artifacts[tier])
      .setColor(tier === 'gold' ? '#FFD700' : tier === 'silver' ? '#C0C0C0' : '#CD7F32')
      .setTimestamp();
      
    await user.send({ embeds: [embed] });
  } catch (error) {
    console.error(`Failed to send artifact to ${discordId}:`, error);
  }
}

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'operational', 
    timestamp: new Date().toISOString(),
    version: '1.0.0-revenue-unified' 
  });
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🔱 Kypria Revenue Engine running on port ${PORT}`);
  console.log(`🎯 Webhook endpoint: /webhook/patreon`);
  console.log(`🩺 Health check: /health`);
});

module.exports = app;