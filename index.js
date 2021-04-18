const fetchUrl = require("fetch").fetchUrl;
const telegram = require('node-telegram-bot-api')
require('dotenv').config()

const token = process.env.TELEGRAM_TOKEN
const chatID = process.env.TELEGRAM_ID

const bot = new telegram(token, {polling: true})

var bitcoinPrices = []

async function getBody(url) {
    let urlResponse = new Promise((resolve, reject) => {
        fetchUrl(url, function(err, meta, body){
            if (err) {
                console.error(err)
                reject(null)
            }
            resolve(body.toString())
        })
    })

    return urlResponse
}

function parseTime(date) {
    let hour = date.getHours(), min = date.getMinutes(), special = 'AM'

    if (hour >= 12) { special = 'PM' }
    if (hour > 12) { hour = hour - 12}
    if (min < 10) { min = '0' + min }

    return hour + ':' + min + ' ' + special
}

function parsePrice(price) { return '$' + parseFloat(price).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",") }

async function getBTC() {
    let coinbase_BTC_json = JSON.parse(await getBody("https://api.coinbase.com/v2/prices/spot?currency=USD")), now = new Date()
    if (coinbase_BTC_json === null) { return }

    let btcPrice = coinbase_BTC_json.data.amount
    bitcoinPrices.push([parseFloat(btcPrice), parseTime(now)])

    console.log('BTC is currently worth $' + parseFloat(btcPrice).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",") + ' at ' + parseTime(now))
    console.log('BTC Price Array Length: ' + bitcoinPrices.length)

    let oneMin = [2, -0.5], fiveMin = [6, -1], tenMin = [11, -2], thirtyMin = [30, -5]
        timeArray = [oneMin, fiveMin, tenMin, thirtyMin]

    for (let i = 0; i < timeArray.length; i++) {
        if (bitcoinPrices.length >= timeArray[i][0]) {
            let oldPrice = bitcoinPrices[bitcoinPrices.length-timeArray[i][0]][0], newPrice = bitcoinPrices[bitcoinPrices.length-1][0],
                precentChange = ((1 - (newPrice/oldPrice)) * 100 * - 1).toFixed(2)

            if (precentChange <= timeArray[i][1]) {
                let message = 'BITCOIN HAS FALLEN! ' + precentChange + '% over ' + (timeArray[i][0] - 1)

                if (timeArray[0][0] === 2) {
                    message += ' minute \n'
                } else {
                    message += ' minutes \n'
                }

                message += 'Price at ' +  bitcoinPrices[bitcoinPrices.length-timeArray[i][0]][1] + ': ' + parsePrice(oldPrice) + '\n' +
                    'Price at ' +  bitcoinPrices[bitcoinPrices.length-1][1] +      ': ' + parsePrice(newPrice)
                
                bot.sendMessage(chatID, message)
            }
        }
    }

    if (bitcoinPrices.length > 120) {
        bitcoinPrices.shift()
    }
}

while(true) {
    let now = new Date()
    if (now.getSeconds() === 0) {
        main()
        break
    }
}

function main() {
    getBTC(), setInterval(getBTC, 1000 * 60)
}