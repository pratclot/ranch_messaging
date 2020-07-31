require('dotenv').config();

var admin = require("firebase-admin");
const topic = 'alarms';

var serviceAccount = require(process.env.FIREBASE_KEY_PATH);

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: process.env.FIREBASE_DB_URL
});

const winston = require('winston');
const {combine, timestamp, printf, json} = winston.format;

const WebSocket = require('ws');

var ws = setupWs();

function connectWs() {
    try {
        ws = new WebSocket(process.env.WATCH_SERVER + process.env.WATCH_PATH);
        ws.onerror = (event) => {
            if (event.error.code == 'ECONNREFUSED') {
            } else {
                console.log(event.error.message);
            }
        };
        ws.onclose = (event) => {
            if (event.code == 1006) {
                reconnectWs();
            }
        };
        return ws;
    } catch (e) {
        console.log(e);
    }
}

function reconnectWs() {
    ws = setTimeout(setupWs, 100);
}

function setupWs() {
    var ws = connectWs();
    const logger = setupLogger();
    applyWsCallback(ws, logger);
    return ws
}


function setupLogger() {
    require('winston-daily-rotate-file');

    const myFormat = printf(({message, timestamp}) => {
        return `${timestamp}: ${message.replace(/\n/g, `\n  ${' '.repeat(timestamp.length)}`)}`;
    });

    var transport = new winston.transports.DailyRotateFile({
        filename: 'application-%DATE%.log',
        datePattern: 'YYYY-MM-DD',
        zippedArchive: true,
        maxSize: '20m',
        maxFiles: '14d',
        dirname: 'logs',
        eol: '\n'
    });
    var logger = winston.createLogger({
        transports: [
            transport
        ],
        format: combine(
            timestamp(),
            myFormat
        ),
    });
    return logger;
}

function applyWsCallback(ws, logger) {
    ws.on('message', function incoming(data) {
        console.log(parseData(data));
        logger.info(data);
    });
}

function parseData(data) {
    var splitData = data.split(/:(.+)/);
    switch (splitData[0]) {
        case '$':
            return sendAlarms(splitData);
            break;
        default:
            return 'NOT IMPLEMENTED! ' + data;
    }
}

function sendAlarms(splitData) {
    const msg = splitData[1].split(',').slice(1, 3);
    const message = {
        data: {
            msg: msg.toString()
        },
        topic: topic,
        notification: {
            title: "ALARM TRIGGERED",
            body: msg.toString()
        }
    };
    admin.messaging().send(message)
        .then((response) => {
            console.log(`Sent, ${response}`)
        })
        .catch((error) => {
            console.log(`Error, ${error}`)
        })
    ;
    return msg;
}

