import http from "http";
import ws from "websocket"
import redis from "redis";

const APPID = process.env.APPID;
const PORT = 8080;
const REDIS_PORT = 6379;
const REDIS_HOST = 'rds';

const clientConnections = new Map();

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
        // subscribe the server
        subscriber.subscribe(docid);
        // accept and setup new client connection
        const newClientConnection = request.accept(null, request.origin);
        newClientConnection.on("open", () => console.log(`${APPID} opened a new ws`))
        newClientConnection.on("close", () => {
            console.log(`${APPID}: a client closed his connection`);
            // remove client connection from connection pool
            const clientConnectionsForDoc = clientConnections.get(docid) || [];
            const index = clientConnectionsForDoc.indexOf(newClientConnection);
            if (index > -1) {
                clientConnectionsForDoc.splice(index, 1);
                clientConnections.set(
                    docid, clientConnectionsForDoc
                )
            }
        })
        newClientConnection.on("message", message => {
            //publish the message to redis
            console.log(`${APPID} Received message ${message.utf8Data}`)
            publisher.publish(docid, message.utf8Data)
        });
        // send success message to the new connected client
        // setTimeout to give client to set:
        // ws.onmessage = message => console.log(message)
        setTimeout(() => newClientConnection.send(JSON.stringify({ message: `Connected successfully to server ${APPID}` })), 10000);
        // momoize the new connection
        const clientConnectionsForDoc = clientConnections.get(docid) || [];
        if (clientConnectionsForDoc.indexOf(newClientConnection) === -1) {
            clientConnectionsForDoc.push(newClientConnection);
            clientConnections.set(
                docid, clientConnectionsForDoc
            );
        }
        // send current value to the new client
        try {
            const cb = (err, reply) => {
                if (err) {
                    console.log(err);
                    return;
                }
                if (reply) {
                    const currentDocData = JSON.parse(reply);
                    Object.entries(currentDocData).forEach(([key, value]) => {
                        const newMsg = {
                            fieldName: key,
                            newVal: value,
                            clientId: null
                        };
                        newClientConnection.send(JSON.stringify(newMsg));
                    });
                }
            }
            publisher.get(docid, cb);
        } catch (error) {
            console.log(error);
        }
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
    // console.log(`Server ${APPID} subscribed successfully to ${CHANNEL}`)
    // publisher.publish(CHANNEL, "First Message");
    console.log({ msg: 'subscribed to', APPID, channel, count })
});

subscriber.on("message", function (channel, message) {
    try {
        console.log(`Server ${APPID} received message in channel ${channel} msg: ${message}`);
        // save to redis cache
        try {
            const json = JSON.parse(message);
            if (json.hasOwnProperty('fieldName') && json.hasOwnProperty('newVal')) {
                try {
                    const cb = (err, reply) => {
                        if (err) {
                            console.log(err);
                            return;
                        }
                        if (reply) {
                            const data = JSON.parse(reply);
                            data[json.fieldName] = json.newVal;
                            publisher.set(channel, JSON.stringify(data), redis.print);
                        } else {
                            const newData = {};
                            newData[json.fieldName] = json.newVal;
                            publisher.set(channel, JSON.stringify(newData), redis.print);
                        }
                    }
                    publisher.get(channel, cb);
                } catch (error) {
                    console.log(error);
                }
            }
        } catch (error) {
            console.log({ error: error.message, message });
        }
        // forward message to all subscribed clients to that channel = docid
        const clientConnectionsForDoc = clientConnections.get(channel);
        clientConnectionsForDoc.forEach(connection => connection.send(message))
    }
    catch (error) {
        console.log("ERR::" + error)
    }
});

// TODO code clean up after closing connection
// subscriber.unsubscribe();
// subscriber.quit();
// publisher.quit();