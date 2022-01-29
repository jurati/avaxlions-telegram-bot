const TeleBot = require('telebot');
const dotenv = require('dotenv')
const bot = new TeleBot(dotenv.config().parsed.TOKEN);
const request = require('request');
const master = dotenv.config().parsed.MASTER

bot.on('/floor', (msg) => {
    request(`https://api12.avaxlions.com/minted?page=0&sort=lowest_price`, function (error, response, body) {
        let lion = JSON.parse(body).data[0];

        sendLionReply(msg, lion, `Floor ${lion.price} AVAX for ${lion.name}`)
    });
});

bot.on(/^\/lion (.+)$/, (msg, props) => {
    const lionNumber = props.match[1];

    request(`https://api12.avaxlions.com/list-meta?indices=${lionNumber}`, function (error, response, body) {
        try {
            var lion = JSON.parse(body)[0]

            sendLionReply(msg, lion, lion.name)
        } catch (e) {
            msg.reply.text(`could not find lion ${lionNumber}`);
        }
    });
});

let sellsInterval;
let listingsInterval;
let lastListedAt = new Date();
let lastSaleAt = new Date();

bot.on('/sells', (msg) => {
    clearInterval(sellsInterval);

    if (master != msg.from.id) {
        return;
    }

    sellsInterval = setInterval(() => {
        request(`https://api12.avaxlions.com/minted?page=0&sort=recently_sold`, function (error, response, body) {
            let lions = JSON.parse(body).data.filter(lion => new Date(lion.saleAt) > lastSaleAt);

            for (const lion of lions.reverse()) {
                sendLionReply(msg, lion, `SOLD ${lion.name} for ${lion.lastSale} AVAX`)
            }

            if (lions.length > 0) {
                lastSaleAt = new Date(lions[0].saleAt)
            }
        });
    }, 30 * 1000)
});


bot.on('/listings', (msg) => {
    clearInterval(listingsInterval);

    if (master != msg.from.id) {
        return;
    }

    listingsInterval = setInterval(() => {
        request(`https://api12.avaxlions.com/minted?page=0&sort=recently_listed`, function (error, response, body) {
            let lions = JSON.parse(body).data.filter(lion => new Date(lion.listedAt) > lastListedAt);

            for (const lion of lions.reverse()) {
                sendLionReply(msg, lion, `LISTED ${lion.name} for ${lion.price} AVAX`)
            }

            if (lions.length > 0) {
                lastListedAt = new Date(lions[0].listedAt)
            }
        });
    }, 30 * 1000)
});

bot.start();

function sendLionReply(msg, lion, title) {
    let text = `[${title}](https://www.avaxlions.com/lion/${lion.id})\n\n`
    text += `*Rarity:* ${lion.score}\n`
    text += `*Last:* ${lion.lastSale ? `${lion.lastSale} AVAX` : 'Never sold'}\n`
    text += `*Current:* ${lion.price ? `${lion.price} AVAX` : 'Not Selling'}\n\n`

    for (const attribute of lion.attributes) {
        text += `*${attribute.trait_type}:* ${attribute.value}\n`
    }

    msg.reply.photo(lion.image, {"caption" : text, "parseMode": "markdown"});
}