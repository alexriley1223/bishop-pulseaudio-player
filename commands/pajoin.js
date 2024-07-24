const BishopCommand = require('@classes/BishopCommand');
const { SlashCommandBuilder } = require('@discordjs/builders');
const { getParentDirectoryString } = require('@helpers/utils');
const { commands } = require('../config.json');
const { AudioPlayerStatus, joinVoiceChannel } = require('@discordjs/voice');
const cp = require('child_process');
const { PassThrough } = require('stream');
const { createAudioResource } = require('discord-voip');
const prism = require('prism-media');
const { EmbedBuilder } = require('discord.js');
const { musicChannelId } = require('../config.json');
const { color } = require('@config/bot.json');

module.exports = new BishopCommand({
	enabled: commands[getParentDirectoryString(__filename, __dirname)],
	data: new SlashCommandBuilder().setName('pajoin').setDescription('Start a PulseAudio stream'),
	execute: async function(interaction) {
		const userChannel = interaction.member.voice.channel;

		if (!userChannel) {
			return await interaction.editReply('You are not in a voice channel!');
		}

		if (!userChannel.viewable) {
			return await interaction.editReply('I need `View Channel` permissions!');
		}

		if (!userChannel.joinable) {
			return await interaction.editReply('I need `Connect Channel` permissions!');
		}

		if (userChannel.full) {
			return await interaction.editReply('Voice channel is full!');
		}

		if (interaction.member.voice.deaf) {
			return await interaction.editReply('You cannot run this command while deafened!');
		}

		if (interaction.guild.members.me?.voice?.mute) {
			return await interaction.editReply('Please unmute me before playing!');
		}

		const connection = joinVoiceChannel({
			channelId: userChannel.id,
			guildId: interaction.channel.guild.id,
			adapterCreator: interaction.channel.guild.voiceAdapterCreator
		});

		const player = interaction.client.bishop.pulseaudio.player;
		
		connection.subscribe(player);
	
		player.on(AudioPlayerStatus.Idle, () => {
			interaction.client.bishop.pulseaudio.maxTries++;
			interaction.client.bishop.logger.info('PULSE', `Attempt #${interaction.client.bishop.pulseaudio.maxTries} to restart PulseAudio player.`);
			if(interaction.client.bishop.pulseaudio.maxTries >= 5) {
				interaction.client.bishop.logger.info('PULSE', `Too many attempts to restart player. Killing process and exiting.`);
				connection.destroy();
				interaction.client.bishop.pulseaudio.pacat.kill();
			}

			// Reset after 10 seconds
			setTimeout(() => {
				interaction.client.bishop.pulseaudio.maxTries = 0;
			}, 10000);
			startPlayer(interaction.client);
		});
	
		player.on('error', (error) => {
			console.error('Error playing audio:', error);
		});
		
		startPlayer(interaction.client);

		const nowPlaying = new EmbedBuilder();

		nowPlaying
			.setColor(color)
			.setTitle('🔊  Started Streaming PulseAudio')
			.setTimestamp()
			.setFooter({ text: `Requested by: ${interaction.member.user.username}`, iconURL: `${interaction.member.user.displayAvatarURL({ dynamic: true })}` });

			interaction.client.channels.cache.get(musicChannelId).send({ embeds: [nowPlaying] });

		return interaction.reply({
			content: `Now playing PulseAudio stream!`,
			ephemeral: true,
		});
	},
});


function startPlayer(client) {
	const pacat = cp.spawn('sh', ['-c', 'pacat -d auto_null.monitor -r --rate=48000']);

	const opusEncoder = new prism.opus.Encoder({
		channels: 2,
		rate: 48000,
		frameSize: 960
	});

	// Use PassThrough stream to handle the buffering
	const passThrough = new PassThrough();

	// Pipe pacat output through the PassThrough stream to the Opus encoder
	pacat.stdout.pipe(passThrough).pipe(opusEncoder);

	// Create an audio resource from the Opus encoded stream
	const audioResource = createAudioResource(opusEncoder, {
		inputType: 'opus',
		inlineVolume: true,
		silencePaddingFrames: 0
	});

	client.bishop.pulseaudio.player.play(audioResource);

	pacat.on('exit', (code) => {
		client.bishop.logger.warn('PULSE', `pacat process exited with code ${code}`)
	});

	client.bishop.pulseaudio.pacat = pacat;
}
