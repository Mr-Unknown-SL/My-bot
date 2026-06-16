module.exports = {
    name: 'alive', 
    aliases: ['bot', 'status'], 
    description: 'Bot සක්‍රීයද කියා බැලීමට සහ මූලික තොරතුරු ලබා ගැනීමට.', 
    category: 'main', 
    react: '👋', 
    
    run: async (sock, from, mek, { args, q, currentSettings }) => {
        try {
            const imageUrl = 'https://telegra.ph/file/0c6f5dbd9aa2e97b3d360.jpg'; 
            const statusText = (currentSettings.owner_react_status || 'on').toUpperCase(); 
            
            const aliveMessage = `👋 *Hello Machan!* I am alive and working perfectly.\n\n` +
                                 `⚡ *Status:* Online\n` +
                                 `⚙️ *Current Prefix:* ${currentSettings.prefix || '.'}\n` +
                                 `👑 *Owner React:* ${currentSettings.owner_react || '❤️'}\n` +
                                 `🔋 *Auto React Status:* ${statusText}`;
            
            await sock.sendMessage(from, { 
                image: { url: imageUrl }, 
                caption: aliveMessage 
            }, { quoted: mek });

        } catch (e) {
            throw e;
        }
    }
};
