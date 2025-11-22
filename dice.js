const TelegramBot = require('node-telegram-bot-api');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// ========================================================
// ⚙️ CONFIGURATION
// ========================================================
// 1. REPLACE 'YOUR_BOT_TOKEN_HERE' with the token from @BotFather
const token = '8490224778:AAHBykM6v_R9cI4ctWPpfbr5RxHN_S4ZfnE';

// 2. REPLACE 'YOUR_ADMIN_ID_HERE' with your numeric Telegram ID (Get it from @userinfobot)
// Example: const ADMIN_ID = 123456789;
const ADMIN_ID = 7812499632; 

// Game Settings
const STARTING_BALANCE = 500;
const DAILY_BONUS = 100;
const PAYOUT_MULTIPLIERS = {
    under: 1.8, // Pays 1.8x (e.g., bet 100, win 180)
    over: 1.8,
    equal: 4.0
};

// Initialize Bot
const bot = new TelegramBot(token, { polling: true });

// Initialize Database
const dbPath = path.resolve(__dirname, 'database.sqlite');
const db = new sqlite3.Database(dbPath);

// Game State (In-Memory)
let gameState = {
    isOpen: false,
    bets: [] // Array to store active bets: { userId, name, type, amount }
};

// ========================================================
// 🗄️ DATABASE SETUP
// ========================================================
db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY,
        username TEXT,
        balance INTEGER DEFAULT ${STARTING_BALANCE},
        last_claim INTEGER DEFAULT 0
    )`);
});

// Helper: Get User (or create if not exists)
const getUser = (id, username) => {
    return new Promise((resolve, reject) => {
        db.get("SELECT * FROM users WHERE id = ?", [id], (err, row) => {
            if (err) return reject(err);
            if (!row) {
                // Create new user
                db.run("INSERT INTO users (id, username, balance) VALUES (?, ?, ?)", [id, username, STARTING_BALANCE], (err) => {
                    if (err) return reject(err);
                    resolve({ id, username, balance: STARTING_BALANCE, last_claim: 0 });
                });
            } else {
                resolve(row);
            }
        });
    });
};

// Helper: Update Balance
const updateBalance = (id, amount) => {
    return new Promise((resolve, reject) => {
        db.run("UPDATE users SET balance = balance + ? WHERE id = ?", [amount, id], (err) => {
            if (err) reject(err);
            else resolve();
        });
    });
};

// ========================================================
// 🎮 COMMAND HANDLERS
// ========================================================

// 1. /start & /help
bot.onText(/\/start|\/help/, async (msg) => {
    const chatId = msg.chat.id;
    const user = await getUser(msg.from.id, msg.from.username);
    
    const helpText = `
🎰 *Welcome to the Dice Betting Group!* 🎰

Here you can bet *Bot Coins* on the outcome of the Admin's dice roll.
*Current Balance:* ${user.balance} Coins

📜 *HOW TO PLAY:*
1. Admin opens bets with \`/rollbet\`.
2. You place bets using commands:
   • \`/under 50\` (Predict sum 2-6)
   • \`/equal 50\` (Predict sum 7)
   • \`/over 50\` (Predict sum 8-12)
3. Admin rolls the dice. Winners get paid!

🎁 *FREE COINS:*
• You get ${STARTING_BALANCE} Coins just for joining.
• Use \`/claim\` every 24 hours for +${DAILY_BONUS} Coins!

📊 *COMMANDS:*
/bal - Check your balance
/top - View Leaderboard
/mybets - See your active bets
    `;
    bot.sendMessage(chatId, helpText, { parse_mode: 'Markdown' });
});

// 2. /bal (Check Balance)
bot.onText(/\/bal/, async (msg) => {
    const user = await getUser(msg.from.id, msg.from.username);
    bot.sendMessage(msg.chat.id, `💰 @${user.username || 'User'}, your wallet: *${user.balance} Coins*`, { parse_mode: 'Markdown' });
});

// 3. /claim (Daily Bonus)
bot.onText(/\/claim/, async (msg) => {
    const userId = msg.from.id;
    const user = await getUser(userId, msg.from.username);
    const now = Date.now();
    const oneDay = 24 * 60 * 60 * 1000;

    if (now - user.last_claim > oneDay) {
        // Grant Bonus
        db.run("UPDATE users SET balance = balance + ?, last_claim = ? WHERE id = ?", [DAILY_BONUS, now, userId]);
        bot.sendMessage(msg.chat.id, `🎁 *Daily Bonus!* You received ${DAILY_BONUS} Coins.\nNew Balance: ${user.balance + DAILY_BONUS}`, { parse_mode: 'Markdown' });
    } else {
        // Too early
        const timeLeft = Math.ceil(((user.last_claim + oneDay) - now) / (1000 * 60 * 60));
        bot.sendMessage(msg.chat.id, `⏳ Come back in *${timeLeft} hours* for your next bonus.`, { parse_mode: 'Markdown' });
    }
});

// 4. /top (Leaderboard)
bot.onText(/\/top/, (msg) => {
    db.all("SELECT username, balance FROM users ORDER BY balance DESC LIMIT 10", (err, rows) => {
        if (err) return;
        let text = "🏆 *RICH LIST* 🏆\n\n";
        rows.forEach((row, index) => {
            text += `${index + 1}. ${row.username || 'Anon'}: ${row.balance} 💰\n`;
        });
        bot.sendMessage(msg.chat.id, text, { parse_mode: 'Markdown' });
    });
});

// 5. Betting Logic (/under, /over, /equal)
const handleBet = async (msg, type, amountStr) => {
    if (!gameState.isOpen) {
        return bot.sendMessage(msg.chat.id, "🚫 *Betting is closed!* Wait for Admin to start a round.", { parse_mode: 'Markdown' });
    }

    const amount = parseInt(amountStr);
    if (isNaN(amount) || amount <= 0) {
        return bot.sendMessage(msg.chat.id, "⚠️ Please enter a valid amount. Example: `/under 50`", { parse_mode: 'Markdown' });
    }

    const user = await getUser(msg.from.id, msg.from.username);

    if (user.balance < amount) {
        return bot.sendMessage(msg.chat.id, `💸 Insufficient funds! You have ${user.balance} Coins.`, { parse_mode: 'Markdown' });
    }

    // Deduct money and store bet
    await updateBalance(user.id, -amount);
    gameState.bets.push({
        userId: user.id,
        username: user.username || 'User',
        type: type,
        amount: amount
    });

    bot.sendMessage(msg.chat.id, `✅ Bet Placed! ${user.username} bet *${amount}* on *${type.toUpperCase()}*.`, { parse_mode: 'Markdown' });
};

bot.onText(/\/under (.+)/, (msg, match) => handleBet(msg, 'under', match[1]));
bot.onText(/\/equal (.+)/, (msg, match) => handleBet(msg, 'equal', match[1]));
bot.onText(/\/over (.+)/, (msg, match) => handleBet(msg, 'over', match[1]));

// ========================================================
// 👑 ADMIN COMMANDS
// ========================================================

// 1. /rollbet (Open Betting)
bot.onText(/\/rollbet/, (msg) => {
    if (msg.from.id !== ADMIN_ID) return;

    gameState.isOpen = true;
    gameState.bets = []; // Reset bets

    const text = `
🎲 *NEW ROUND STARTED!* 🎲

*Admin is about to roll the dice!*
The sum of 2 dice decides the winner:

⬇️ *UNDER (2-6)* pays 1.8x
Eq *EQUAL (7)* pays 4.0x
⬆️ *OVER (8-12)* pays 1.8x

_Place your bets now!_
Example: \`/over 100\`
    `;
    bot.sendMessage(msg.chat.id, text, { parse_mode: 'Markdown' });
});

// 2. /rollnow (Close Bets & Roll)
bot.onText(/\/rollnow/, async (msg) => {
    if (msg.from.id !== ADMIN_ID) return;
    if (!gameState.isOpen) return bot.sendMessage(msg.chat.id, "Start a round with /rollbet first.");

    gameState.isOpen = false; // Close betting
    bot.sendMessage(msg.chat.id, "🛑 *BETS CLOSED! Rolling...* 🛑", { parse_mode: 'Markdown' });

    // Send two dice animations
    // Telegram API sendDice returns the value of the roll
    const dice1 = await bot.sendDice(msg.chat.id, { emoji: '🎲' });
    const dice2 = await bot.sendDice(msg.chat.id, { emoji: '🎲' });
    
    const val1 = dice1.dice.value;
    const val2 = dice2.dice.value;
    const total = val1 + val2;

    setTimeout(async () => {
        // Calculate Outcome
        let outcome = 'equal';
        if (total < 7) outcome = 'under';
        if (total > 7) outcome = 'over';

        let winnersText = "";
        let totalPayout = 0;

        // Process Bets
        for (const bet of gameState.bets) {
            if (bet.type === outcome) {
                const winnings = Math.floor(bet.amount * PAYOUT_MULTIPLIERS[outcome]);
                await updateBalance(bet.userId, winnings); // Add stake + profit (calculated in multiplier logic usually, but here updateBalance adds to existing. 
                // Wait, logic check: We deducted bet earlier. 
                // If user bets 100 on 2.0x, they have -100. If win, we give 200. Net +100. Correct.
                
                winnersText += `• @${bet.username}: +${winnings} Coins\n`;
                totalPayout += winnings;
            }
        }

        // Announce Results
        const resultMsg = `
🏁 *RESULT: ${val1} + ${val2} = ${total}* 🏁
Outcome: *${outcome.toUpperCase()}*

🎉 *WINNERS:*
${winnersText || "No winners this round! 🦅"}

_Next round starts when Admin commands._
        `;
        bot.sendMessage(msg.chat.id, resultMsg, { parse_mode: 'Markdown' });

    }, 3000); // Wait 3 seconds for animation to finish visually
});

// 3. /addcoins (Admin Cheat Code)
bot.onText(/\/addcoins (\d+)/, (msg, match) => {
    if (msg.from.id !== ADMIN_ID) return;
    const amount = parseInt(match[1]);
    
    // Assuming this is a reply to a user
    if (msg.reply_to_message) {
        const targetId = msg.reply_to_message.from.id;
        const targetName = msg.reply_to_message.from.username;
        updateBalance(targetId, amount);
        bot.sendMessage(msg.chat.id, `✅ Added ${amount} Coins to @${targetName}`);
    } else {
        // If not a reply, add to self
        updateBalance(ADMIN_ID, amount);
        bot.sendMessage(msg.chat.id, `✅ Added ${amount} Coins to Admin.`);
    }
});

console.log("Bot is running...");