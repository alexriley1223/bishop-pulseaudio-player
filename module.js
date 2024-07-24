const { ActivityType } = require('discord.js');
const { isModuleEnabled } = require('./config.json');
const package = require('./package.json');
const BishopModule = require('@classes/BishopModule');
const { createAudioPlayer, AudioPlayerStatus } = require('@discordjs/voice');

module.exports = (client) => {
	return new BishopModule({
		name: 'Bishop Pulse Audio',
		description: package.description,
		version: package.version,
		enabled: isModuleEnabled,
		author: 'Alex Riley',
		directory: __dirname,
		init: function(client) {
			const player = createAudioPlayer();
			client.bishop.pulseaudio = {};
			client.bishop.pulseaudio.player = player;
			client.bishop.pulseaudio.maxTries = 0;

			player.on(AudioPlayerStatus.Playing, () => {
				client.user.setPresence({
					activities: [{ name: `PulseAudio Stream`, type: ActivityType.Listening }],
				});
			});

			player.on('error', (error) => {
				client.bishop.logger.error(
					'PULSE',
					'Error playing audio for the Pulse Audio module. \n' + error,
				);
			});
		},
	});
};
