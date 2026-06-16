const { default: makeWASocket, useMultiFileAuthState, delay, jidNormalizedUser, DisconnectReason } = require("@whiskeysockets/baileys");
const pino = require("pino");
const readline = require("readline");
const fs = require("fs");
const path = require("path");
const { Boom } = require("@hapi/boom");

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
const question = (text) => new Promise((resolve) => rl.question(text, resolve));

let isFirstConnect = true; 

// ---- [ JSON FILE DATABASE SYSTEM ] ----
const dbPath = path.join(__dirname, "bot_settings.json");

const defaultSettings = {
    prefix: '.',
    sudo_numbers: '',
    owner_react: '❤️',
    owner_react_status: 'on'
};

function initDatabase() {
    if (!fs.existsSync(dbPath)) {
        fs.writeFileSync(dbPath, JSON.stringify(defaultSettings, null, 2));
    }
}

function getSettings() {
    initDatabase();
    try {
        const data = fs.readFileSync(dbPath, "utf8");
        return JSON.parse(data);
    } catch (e) {
        return defaultSettings;
    }
}

function saveSettings(newSettings) {
    fs.writeFileSync(dbPath, JSON.stringify(newSettings, null, 2));
}
// ---------------------------------------

const commands = {};

function loadPlugins() {
    const pluginsPath = path.join(__dirname, "plugins");
    if (!fs.existsSync(pluginsPath)) fs.mkdirSync(pluginsPath);

    const files = fs.readdirSync(pluginsPath).filter(file => file.endsWith(".js"));
    for (const file of files) {
        try {
            const plugin = require(path.join(pluginsPath, file));
            if (plugin.name) {
                commands[plugin.name] = plugin;
                if (plugin.aliases && Array.isArray(plugin.aliases)) {
                    for (const alias of plugin.aliases) {
                        commands[alias] = plugin;
                    }
                }
            }
        } catch (err) {
            console.log(`❌ Plugin එක load කරන්න බැරි වුණා (${file}): `, err);
        }
    }
    const uniqueCmds = new Set(Object.values(commands));
    console.log(`📦 Plugins සාර්ථකව Load වුණා! Total Commands: ${uniqueCmds.size}`);
}

loadPlugins();

async function startBot() {
    const { state, saveCreds } = await useMultiFileAuthState('auth_info_auth');

    // 🛠️ Auto-reconnect ලෙඩේ හැදීමට connection options
    const sock = makeWASocket({
        logger: pino({ level: 'silent' }),
        printQRInTerminal: false,
        auth: state,
        keepAliveIntervalMs: 30000, // හැම තත්පර 30කටම සැරයක් connection එක live ද බලනවා
        connectTimeoutMs: 60000,
        defaultQueryTimeoutMs: 0,
        emitOwnEvents: true
    });

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect } = update;
        
        if (connection === 'close') {
            const shouldReconnect = (lastDisconnect?.error instanceof Boom) 
                ? lastDisconnect.error.output.statusCode !== DisconnectReason.loggedOut 
                : true;
            
            console.log('❌ Connection එක වැහුණා. Reason: ', lastDisconnect?.error || 'Unknown');
            
            if (shouldReconnect) {
                console.log('🔄 ආයෙත් Reconnect වෙනවා... පොඩ්ඩක් ඉන්න මචං...');
                await delay(3000); 
                startBot(); 
            } else {
                console.log('🚫 ඔයා Phone එකෙන් ලොග් අවුට් වෙලා. කරුණාකර "auth_info_auth" folder එක මකලා අලුතෙන් code එකක් ගන්න.');
            }
        } 
        
        else if (connection === 'open') {
            console.log('✅ WhatsApp එක සාර්ථකව Connect වුණා!');
            const myNumberJid = jidNormalizedUser(sock.user.id);

            if (isFirstConnect && sock.authState.creds.registered) {
                await delay(2000); 
                await sock.sendMessage(myNumberJid, { text: '🎉 WhatsApp bot connected with Owner Auto-React System!' });
                isFirstConnect = false; 
            }

            await delay(1000);
            await sock.sendMessage(myNumberJid, { text: '🚀 Bot working 100% (Connection Stable Now)' });
        }
    });

    sock.ev.on('messages.upsert', async (chatUpdate) => {
        try {
            const mek = chatUpdate.messages[0];
            if (!mek.message) return; 
            if (mek.key && mek.key.remoteJid === 'status@broadcast') return; 

            const from = mek.key.remoteJid; 
            const type = Object.keys(mek.message)[0]; 
            
            const body = (type === 'conversation') ? mek.message.conversation : 
                         (type === 'extendedTextMessage') ? mek.message.extendedTextMessage.text : '';
            
            const currentSettings = getSettings();
            const prefix = currentSettings.prefix || '.';
            const reactStatus = currentSettings.owner_react_status || 'on'; 

            const isCmd = body.startsWith(prefix);
            const command = isCmd ? body.slice(prefix.length).trim().split(/ +/).shift().toLowerCase() : '';
            const args = body.trim().split(/ +/).slice(1);
            const q = args.join(' ');

            // 👑 ---- [ OWNER / SUDO CLEAN NUMBER LOGIC ] ----
            // Message Yourself / Multi-device වලදී එන `:4` වගේ device IDs අයින් කරන ලොජික් එක 🛠️
            const senderJid = mek.key.fromMe ? jidNormalizedUser(sock.user.id) : (mek.key.participant || mek.key.remoteJid);
            const senderNumber = senderJid ? senderJid.split('@')[0].split(':')[0] : ''; 
            const botNumber = jidNormalizedUser(sock.user.id).split('@')[0].split(':')[0];
            
            const sudoList = (currentSettings.sudo_numbers || '').split(',').map(num => num.trim()).filter(num => num !== '');
            const isOwnerOrSudo = (senderNumber === botNumber || sudoList.includes(senderNumber));

            // Command එකක් නෙවෙයි නම්, එවලා තියෙන්නේ Owner/Sudo නම්, සහ status එක ON නම් සාමාන්‍ය මැසේජ් වලට react කරනවා
            if (!isCmd && isOwnerOrSudo && reactStatus === 'on') {
                if (currentSettings.owner_react) {
                    await sock.sendMessage(from, {
                        react: { text: currentSettings.owner_react, key: mek.key }
                    });
                }
            }
            // --------------------------------------------------

            // ---- [ COMMAND HANDLER ] ----
            if (isCmd && command) {
                const cmd = commands[command];
                if (cmd) {
                    try {
                        if (cmd.react) {
                            await sock.sendMessage(from, {
                                react: { text: cmd.react, key: mek.key }
                            });
                        }
                        await cmd.run(sock, from, mek, { args, q, currentSettings, getSettings, saveSettings, isOwnerOrSudo });
                    } catch (cmdError) {
                        console.error(`❌ Error in .${command} command: `, cmdError);
                        const errorMsg = `⚠️ *BOT ERROR REPORT* ⚠️\n\n• *Command:* .${command}\n• *Error:* ${cmdError.message || cmdError}`;
                        await sock.sendMessage(from, { text: errorMsg }, { quoted: mek });
                    }
                }
            }
        } catch (err) {
            console.log('❌ Error in message handler: ', err);
        }
    });

    if (!sock.authState.creds.registered) {
        await delay(3000); 
        let phoneNumber = await question('📱 WhatsApp Number එක country code එකත් එක්ක දาන්න (e.g., 9477xxxxxxx): ');
        phoneNumber = phoneNumber.replace(/[^0-9]/g, ''); 
        try {
            let code = await sock.requestPairingCode(phoneNumber);
            code = code?.match(/.{1,4}/g)?.join('-') || code; 
            console.log('\n--------------------------------------\n🔑 ඔයාගේ WhatsApp Pairing Code එක: ' + code + '\n--------------------------------------\n');
        } catch (error) { console.error('❌ Code එක ගන්න බැරි වුණා: ', error); }
    }
}

startBot().catch(err => console.log('Main Bot Error: ', err));
