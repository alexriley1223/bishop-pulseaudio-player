const BishopCommand = require('@classes/BishopCommand');
const { SlashCommandBuilder } = require('@discordjs/builders');
const { getParentDirectoryString } = require('@helpers/utils');
const { commands } = require('../config.json');
const { getVoiceConnection } = require('@discordjs/voice');
const { ActivityType } = require('discord.js');
const { EmbedBuilder } = require('discord.js');
const { musicChannelId } = require('../config.json');
const { color } = require('@config/bot.json');

module.exports = new BishopCommand({
	enabled: commands[getParentDirectoryString(__filename, __dirname)],
	data: new SlashCommandBuilder().setName('paleave').setDescription('End a PulseAudio stream'),
	execute: async function(interaction) {
        
		const connection = getVoiceConnection(interaction.channel.guild.id);

        if(connection) {
            interaction.client.user.setPresence({
                activities: [{ name: 'These Hands', type: ActivityType.Competing }],
            });

            connection.destroy();
            interaction.client.bishop.pulseaudio.pacat.kill();

            const stoppedPlaying = new EmbedBuilder();

            stoppedPlaying
                .setColor(color)
                .setTitle('🔇  Stopped Streaming PulseAudio')
                .setTimestamp()
                .setFooter({ text: `Requested by: ${interaction.member.user.username}`, iconURL: `${interaction.member.user.displayAvatarURL({ dynamic: true })}` });
    
                interaction.client.channels.cache.get(musicChannelId).send({ embeds: [stoppedPlaying] });

            await interaction.reply({ content: `Stopped playing PulseAudio stream!`, ephemeral: true});
        } else {
            await interaction.reply({ content: `PulseAudio is not currently streaming!`, ephemeral: true });
        }

	},
});
