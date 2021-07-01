import http from "http";
import ws from "websocket"
import redis from "redis";

const APPID = process.env.APPID;
const CHANNEL = 'presence';
const PORT = 8080;
const REDIS_PORT = 6379;
const REDIS_HOST = 'rds';

const clientConnections = [];

const keyStore = new Set();

// raw http server to handle TCP connection
const httpServer = http.createServer()

const WebSocketServer = ws.server
const webSocket = new WebSocketServer({
    "httpServer": httpServer
})

httpServer.listen(PORT, () => console.log(`${APPID} listening on port ${PORT}`))

const publisher = redis.createClient({
    port: REDIS_PORT,
    host: REDIS_HOST
});

webSocket.on("request", request => {
    // connection-url
    // ws://localhost/?id=65&encoding=text
    // request.resourceURL:
    // Url {
    //     protocol: null,
    //     slashes: null,
    //     auth: null,
    //     host: null,
    //     port: null,
    //     hostname: null,
    //     hash: null,
    //     search: '?id=65&encoding=text',
    //     query: { id: '65', encoding: 'text' },
    //     pathname: '/',
    //     path: '/?id=65&encoding=text',
    //     href: '/?id=65&encoding=text'
    // }
    const { docid } = request && request.hasOwnProperty('resourceURL') && request.resourceURL.hasOwnProperty('query') && request.resourceURL.query

    if (docid) {
        const newClientConnection = request.accept(null, request.origin);
        newClientConnection.on("open", () => console.log(`${APPID} opened a new ws`))
        newClientConnection.on("close", () => {
            console.log(`${APPID}: a client closed his connection`);
            // remove client connection from connection pool
            const index = clientConnections.indexOf(newClientConnection);
            if (index > -1) clientConnections.splice(index, 1);
        })
        newClientConnection.on("message", message => {
            //publish the message to redis
            console.log(`${APPID} Received message ${message.utf8Data}`)
            publisher.publish(CHANNEL, message.utf8Data)
        });
        // send success message to the new connected client
        // setTimeout to give client to set:
        // ws.onmessage = message => console.log(message)
        setTimeout(() => newClientConnection.send(JSON.stringify({ message: `Connected successfully to server ${APPID}` })), 10000);
        clientConnections.push(newClientConnection);
        console.log({ keyStore });
        keyStore.forEach(key => publisher.get(key, (err, reply) => {
            if (err) {
                console.log(err);
            } else {
                const newMsg = {
                    fieldName: key,
                    newVal: reply,
                    clientId: null
                };
                console.log(newMsg);
                newClientConnection.send(JSON.stringify(newMsg));
            }
        }))
    } else {
        // test in browser with:
        // let ws = new WebSocket("ws://localhost:8080");
        // let ws = new WebSocket("ws://localhost:8080/?docid=4711");
        console.log('Rejecting connection due to missing docid-query-parameter.');
        request.reject();
    }
});

const subscriber = redis.createClient({
    port: REDIS_PORT,
    host: REDIS_HOST
});

subscriber.on("subscribe", function (channel, count) {
    console.log(`Server ${APPID} subscribed successfully to ${CHANNEL}`)
    publisher.publish(CHANNEL, "First Message");
});

subscriber.on("message", function (channel, message) {
    try {
        console.log(`Server ${APPID} received message in channel ${channel} msg: ${message}`);
        // save to redis cache
        try {
            const json = JSON.parse(message);
            if (json.hasOwnProperty('fieldName') && json.hasOwnProperty('newVal')) {
                keyStore.add(json.fieldName);
                publisher.set(json.fieldName, json.newVal, redis.print);
            }
        } catch (error) {
            console.log({ error: error.message, message });
        }
        // forward message to all subscribed clients
        clientConnections.forEach(connection => connection.send(message))
    }
    catch (error) {
        console.log("ERR::" + error)
    }
});

subscriber.subscribe(CHANNEL);

// TODO code clean up after closing connection
// subscriber.unsubscribe();
// subscriber.quit();
// publisher.quit();