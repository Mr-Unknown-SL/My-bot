module.exports = {
    name: 'set', 
    aliases: ['settings', 'config'],
    description: 'Botගේ Prefix, Sudo, React, සහ Auto React Status වෙනස් කිරීම.',
    category: 'owner',
    react: '⚙️', 
    
    run: async (sock, from, mek, { args, q, currentSettings, getSettings, saveSettings, isOwnerOrSudo }) => {
        try {
            // 🔒 SECURITY CHECK 1: Owner/Sudo ද බලනවා
            if (!isOwnerOrSudo) {
                return await sock.sendMessage(from, { text: '❌ මචං මේ command එක පාවිච්චි කරන්න පුළුවන් Bot Owner ට හෝ Sudo සාමාජිකයින්ට විතරයි!' }, { quoted: mek });
            }

            const sudoNumbersString = currentSettings.sudo_numbers || '';
            const sudoList = sudoNumbersString.split(',').map(num => num.trim()).filter(num => num !== '');
            let sudoDisplay = 'Not Set';
            if (sudoList.length > 0) {
                sudoDisplay = '\n' + sudoList.map((num, index) => `${index + 1}. ${num}`).join('\n');
            }

            const statusText = (currentSettings.owner_react_status || 'on').toUpperCase(); 

            if (!args[0]) {
                const infoMsg = `⚙️ *BOT CURRENT SETTINGS* ⚙️\n\n` +
                                 `• *Prefix:* ${currentSettings.prefix || '.'}\n` +
                                 `• *Owner React:* ${currentSettings.owner_react || '❤️'}\n` +
                                 `• *Auto React Status:* ${statusText}\n` +
                                 `• *Sudo Numbers:* ${sudoDisplay}\n\n` +
                                 `⚠️ *ආරක්ෂිත පියවර:* \n` +
                                 `මචං මේ settings වෙනස් කරන්න නම්, *මේ මැසේජ් එකටම Reply (Mention) කරලා* පහත විදිහට command එක ගහන්න:\n\n` +
                                 `• .set prefix [new_prefix]\n` +
                                 `• .set sudo [number]\n` +
                                 `• .set owner_react [emoji]\n` +
                                 `• .set owner_react_status [on/off]`;
                
                return await sock.sendMessage(from, { text: infoMsg }, { quoted: mek });
            }

            // 🔒 SECURITY CHECK 2: Mention කරලාද තියෙන්නේ කියලා බලන ආරක්ෂිත ලොජික් එක 🛠️
            const quotedMessage = mek.message?.extendedTextMessage?.contextInfo?.quotedMessage;
            
            if (!quotedMessage) {
                return await sock.sendMessage(from, { 
                    text: '❌ *වැඩේ බෑ මචං!* ඔනෑවට එපාවට settings වෙනස් වෙන එක නවත්තන්නයි මේක දාලා තියෙන්නේ. ⚙️\n\nකරුණාකරලා මුලින්ම නිකන්ම *.set* ගහලා බොට් එවපු settings මැසේජ් එකටම *Reply (Mention)* කරලා මේ command එක ආයෙත් ගහන්න!' 
                }, { quoted: mek });
            }

            const type = args[0].toLowerCase();
            const value = args[1];

            if (!value) return await sock.sendMessage(from, { text: '❌ මචං අලුත් value එකක් දාන්න ඕනේ! (e.g: .set owner_react ❤️)' }, { quoted: mek });

            let settings = getSettings();

            if (type === 'prefix') {
                settings.prefix = value;
                saveSettings(settings);
                await sock.sendMessage(from, { text: `✅ Bot Prefix එක සාර්ථකව *${value}* ට වෙනස් කරා මචං!` }, { quoted: mek });
            } 
            else if (type === 'sudo') {
                const cleanNum = value.replace(/[^0-9]/g, '');
                if (!cleanNum) return await sock.sendMessage(from, { text: '❌ මචං නිවැරදි ෆෝන් නම්බර් එකක් දාන්න!' }, { quoted: mek });

                let currentSudo = settings.sudo_numbers ? settings.sudo_numbers.split(',').map(n => n.trim()).filter(n => n !== '') : [];
                
                if (currentSudo.includes(cleanNum)) {
                    return await sock.sendMessage(from, { text: `⚠️ මචං ඔය නම්බර් එක (${cleanNum}) දැනටමත් Sudo ලිස්ට් එකේ තියෙන්නේ!` }, { quoted: mek });
                }

                currentSudo.push(cleanNum); 
                settings.sudo_numbers = currentSudo.join(',');
                saveSettings(settings);
                await sock.sendMessage(from, { text: `✅ Sudo Number එකක් සාර්ථකව ලිස්ට් එකට එකතු කරා මචං! (Number: ${cleanNum})` }, { quoted: mek });
            } 
            else if (type === 'owner_react') {
                settings.owner_react = value;
                saveSettings(settings);
                await sock.sendMessage(from, { text: `✅ Owner Reaction Emoji එක සාර්ථකව *${value}* ට වෙනස් කරා මචං!` }, { quoted: mek });
            } 
            else if (type === 'owner_react_status') {
                const statusVal = value.toLowerCase();
                if (statusVal !== 'on' && statusVal !== 'off') {
                    return await sock.sendMessage(from, { text: '❌ වැරදියි මචං, on හෝ off විතරක් පාවිච්චි කරන්න!' }, { quoted: mek });
                }
                settings.owner_react_status = statusVal;
                saveSettings(settings);
                await sock.sendMessage(from, { text: `✅ Owner Auto-React එක සාර්ථකව *${statusVal.toUpperCase()}* කරා මචං!` }, { quoted: mek });
            } 
            else {
                await sock.sendMessage(from, { text: '❌ වැරදි setting වර්ගයක් මචං. prefix, sudo, owner_react, හරි owner_react_status හරි විතරක් පාවිච්චි කරන්න.' }, { quoted: mek });
            }

        } catch (e) {
            throw e;
        }
    }
};
