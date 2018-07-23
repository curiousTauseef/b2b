// set up express to host the static site
var port = 8080;
var express = require('express');
var app = express();

var server = require('http').Server(app);
server.listen(port)
app.use(express.static('public'))   // host files in the 'public' dir
console.log('node server is listening on port ' + port);



// task logging vars
var fs = require('fs');
var logs = [];
var taskStart;
//
// for (i=0; i<10; i++){
//     logObj.push({id: i, time: Date.now()});
// }
// var json = JSON.stringify(logObj, null, 3);
// fs.writeFile('testJsonLogs.json', json, 'utf-8');


// set up socket.io
var socket = require('socket.io');
var io = socket(server)  // connect socket function to the express server obj
var senderID;
var receiverID;
var connectionCounter = 0;

// socket events between
io.sockets.on('connection', newConnection);
function newConnection(socket){
    // increment connection counter, and start clock, if necessary
    connectionCounter++;
    if (connectionCounter == 1){
        serverStart = Date.now();
    }

    var id = socket.id;
    console.log('new socket.io connection received: ' + id + '; total: ' + connectionCounter);

    /** receive start message
     * The SENDER is the only client who should send the startMessage, but
     * just to be sure, the task script has separate start buttons for
     * SENDER and RECEIVER, attached to unique functions that send a io.socket
     * message that correctly identifies them. NOTE that only the SENDER will
     * actually start the task
     */
    socket.on('startFromSender', function(){
        senderID = id;
        console.log('got START signal from SENDER. ID: ' + senderID);

        // reset the logs array
        logs = [];
        addLog('incoming', 'SENDER', 'startFromSender');

        // start the task on all connected clients
        io.sockets.emit('startTask');
        addLog('outgoing', 'NodeServer', 'startTask');
    });

    socket.on('startFromReceiver', function(){
        receiverID = id;
        console.log('got START signal from RECEIVER. ID: ' + receiverID);
    })

    // received openMouth message from JS client
    socket.on('openMouth', function(){
        var source = (id == senderID) ? 'SENDER' : 'RECEIVER';
        addLog('incoming', source, 'openMouth');

        // send command to all clients
        sendOpenMouth();
    });

    // received closeMouth message from one client
    socket.on('closeMouth', function(){
        var source = (id == senderID) ? 'SENDER' : 'RECEIVER';

        addLog('incoming', source, 'closeMouth');
        sendCloseMouth();
    });

    // received catchBug message from one client
    socket.on('catchBug', function(){
        var source = (id == senderID) ? 'SENDER' : 'RECEIVER';

        addLog('incoming', source, 'catchBug');
        sendCatchBug();
    });

    // received endTask message from client
    socket.on('endTask', function(){
        var source = (id == senderID) ? 'SENDER' : 'RECEIVER';

        addLog('incoming', source, 'endTask');
        endTask();
    });

    // socket disconnects
    socket.on('disconnect', function(){
        connectionCounter--;
        console.log('socket id ' + socket.id + ' disconnected; total: ' + connectionCounter);
    })
};

function addLog(direction, source, message){
    /** add new log entry.
     * direction: incoming/outgoing
     * source: which component sent the message
     * message: the message type
     */
     logs.push({timestamp: Date.now()-serverStart,
                direction: direction,
                source: source,
                message: message
            });
    console.log(logs);
}

// Functions to send socket messages to ALL clients
function sendOpenMouth(){
    // send open mouth command to all connected clients
    io.sockets.emit('openMouth');
    addLog('outgoing', 'NodeServer', 'openMouth');
};

function sendCloseMouth(){
    // send close mouth command to all connected clients
    io.sockets.emit('closeMouth');
    addLog('outgoing', 'NodeServer', 'closeMouth');
};

function sendCatchBug(){
    // send catch bug command to all connected clients
    io.sockets.emit('catchBug');
    addLog('outgoing', 'NodeServer', 'catchBug');
};

function endTask(){
    // ask each client for all data

    // save all data to disk
    var json = JSON.stringify(logs, null, 3);
    var today = new Date();
    var fname = today.getFullYear() + '-' +
                today.getMonth() + '-' +
                today.getDate() + '_' +
                today.getHours() + ':' +
                today.getMinutes() + ':' + 
                today.getSeconds() + '.json';
    fs.writeFile(fname, json, 'utf-8');

}
var date = today.getFullYear()+'-'+(today.getMonth()+1)+'-'+today.getDate();
var time = today.getHours() + ":" + today.getMinutes() + ":" + today.getSeconds();
var dateTime = date+' '+time;

// URL routes that Pyneal can use to update server with data from sender
app.get('/openMouth', function(request, response){
    addLog('incoming', 'webRoute', 'openMouth');
    sendOpenMouth();
    response.send('node server got openMouth');
});

app.get('/closeMouth', function(request, response){
    addLog('incoming', 'webRoute', 'closeMouth');
    sendCloseMouth();
    response.send('node server got closeMouth');
});

app.get('/catchBug', function(request, response){
    addLog('incoming', 'webRoute', 'catchBug');
    sendCatchBug();
    response.send('node server got catchBug');
});


app.get('/senderConnect', senderConnect);
function senderConnect(request, response){
    // indicate that sender (aka Pyneal) has initialized a connection
    addLog('incoming', 'webRoute', 'pynealConnected');
    console.log('sender connected!');

    // broadcast to clients
    io.sockets.emit('senderConnected');
    addLog('outgoing', 'NodeServer', 'senderConnected');

    // send message back to sender, just cuz
    response.send('sender connected');
};

app.get('/senderDisconnect', senderDisconnect);
function senderDisconnect(request, response){
    // indicate that sender (aka Pyneal) has disconnected
    addLog('incoming', 'webRoute', 'pynealConnected')
    console.log('sender disconnected!')

    // broadcast to clients
    io.sockets.emit('senderDisconnected');
    addLog('outgoing', 'NodeServer', 'senderDisconnected')

    // send message back to sender, just cuz
    response.send('sender disconnected');
};
