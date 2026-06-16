module.exports = {
    name: 'rem',
    aliases: ['remove', 'delete'],
    description: 'Sudo ලිස්ට් එකේ ඉන්න සාමාජිකයින් ඉවත් කිරීම.',
    category: 'owner',
    react: '🗑️', 
    
    run: async (sock, from, mek, { args, q, currentSettings, getSettings, saveSettings, isOwnerOrSudo }) => {
        try {
            if (!isOwnerOrSudo) {
                return await sock.sendMessage(from, { text: '❌ මචං මේ command එක පාවිච්චි කරන්න පුළුවන් Bot Owner ට හෝ Sudo සාමාජිකයින්ට විතරයි!' }, { quoted: mek });
            }

            if (!args[0] || args[0].toLowerCase() !== 'sudo') {
                return await sock.sendMessage(from, { text: '💡 *How to remove a Sudo number:* \n\n.rem sudo [ලිස්ට් එකේ තියෙන අංකය]\nExample: `.rem sudo 1`' }, { quoted: mek });
            }

            const indexStr = args[1];
            if (!indexStr) return await sock.sendMessage(from, { text: '❌ මචං අයින් කරන්න ඕන ලිස්ට් එකේ අංකය දාන්න! (e.g: .rem sudo 1)' }, { quoted: mek });

            let settings = getSettings();
            let sudoList = settings.sudo_numbers ? settings.sudo_numbers.split(',').map(num => num.trim()).filter(num => num !== '') : [];

            const index = parseInt(indexStr) - 1; 

            if (isNaN(index) || index < 0 || index >= sudoList.length) {
                return await sock.sendMessage(from, { text: '❌ මචං ලිස්ට් එකේ තියෙන නිවැරදි අංකයක් දාන්න! `.set` ගහලා ලිස්ට් එක බලන්න.' }, { quoted: mek });
            }

            const removedNum = sudoList.splice(index, 1);
            
            settings.sudo_numbers = sudoList.join(',');
            saveSettings(settings);

            await sock.sendMessage(from, { text: `✅ Sudo Number එක සාර්ථකව ඉවත් කරා මචං!\n\n• idවත් කරපු අංකය: *${removedNum}*` }, { quoted: mek });

        } catch (e) {
            throw e;
        }
    }
};
