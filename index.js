process.env["NTBA_FIX_319"] = 1; // fix promises error in node-telegram-bot-api
const FeedParser = require('feedparser');
const TelegramBot = require('node-telegram-bot-api');
const assert = require('assert');
const config = require('./config.json');
const fs = require('fs');
const request = require('request');

// track articles guids
let articlesGuids = {};
// track open chats
let chatIds = {};

const bot = new TelegramBot(config.token, {polling: true});

bot.onText(/\/start/, (msg, match) => {
	const chatId = msg.chat.id;
	chatIds[chatId] = 1;
	bot.sendMessage(chatId, 'Welcome on BBC News');
	console.log(`New user: ${getUserDesc(msg.from)}`);
});

bot.onText(/\/stop/, (msg, match) => {
	const chatId = msg.chat.id;
	delete chatIds[chatId];
	bot.sendMessage(chatId, 'Bye!');
	console.log(`User left: ${getUserDesc(msg.from)}`);
});

bot.onText(/\/help/, (msg, match) => {
	const chatId = msg.chat.id;
	bot.sendMessage(chatId, 'Send /start to begin receiving BBC Top News. Send /stop to to stop');
});

function getUserDesc(user) {
	let desc = user.first_name;
	if (user.last_name) desc += ' ' + user.last_name;
	if (user.username) desc += ' @' + user.username;
	return desc;
}

// get articles
setInterval(() => {
	request('http://feeds.bbci.co.uk/news/rss.xml')
	.on('error', err => console.error(err.stack))
	.pipe(new FeedParser())
	.on('error', err => console.error(err.stack))
	//.on('meta', meta => { console.log('meta') })
	.on('data', article => notifyNewArticle(article))
	//.on('end', () => { console.log('end') })
}, 60 * 1000);
	
function notifyNewArticle(article) {
	if (articlesGuids[article.guid]) return;
	console.log(`New article: ${article.guid}`);
	let text = `[${article.title}](${article.link})\n${article.description}`;
	for (chatId in chatIds) {
		bot.sendMessage(chatId, text, {
			parse_mode: 'markdown',
			disable_web_page_preview: true,
			//disable_notification: true
		})
		.catch(err => console.error(err.stack));
	}
	articlesGuids[article.guid] = 1;
}

// save state
setInterval(() => {
	fs.writeFile('articles_guids.json', JSON.stringify(articlesGuids), err => err && console.error(err.stack));
	fs.writeFile('chat_ids.json', JSON.stringify(chatIds), err => err && console.error(err.stack));
}, 15 * 60 * 1000);
