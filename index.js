var express = require('express');
var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);

app.use(express.static('src'));
app.use('/js/vendor', express.static('node_modules'));


app.get('/', function(req, res){
    res.sendFile(__dirname + '/src/index.html');
});

app.set('port', (process.env.PORT || 5000));

http.listen(app.get('port'), function(){
    console.log('listening on *:' + app.get('port'));
});

var users = new Object();

io.sockets.on('connection', function (socket) {

    socket.on('heartbeat', function() {
        socket.broadcast.emit('heartbeat');
    });


    socket.on('init', function(data) {
        if (Object.keys(io['sockets']['adapter']['rooms'][data.sessionName]).length == 1) {
            io.to(socket.id).emit('start');
        } else {
            io.to(socket.id).emit('wait_for_heartbeat');
        }
    });

    socket.on('subscribe', function(data) {
        console.log(data.username + " has joined " + data.sessionName);
        socket.join(data.sessionName);
        users[socket.id] = data;
        io.to(data.sessionName).emit('user joined', data);
    });

    socket.on('disconnect', function() {
        if (users[socket.id]) {
            console.log(users[socket.id].username + " has left " + users[socket.id].sessionName);
            io.to(users[socket.id].sessionName).emit('user left', users[socket.id]);
            users[socket.id] = "";
            //console.log(io['sockets']['adapter']['rooms']);
        }
    });

    socket.on('broadcast_canvas', function(data) {
        socket.broadcast.emit('receive_canvas', data);
    });

    socket.on('request_connected_count', function(data) {
        io.to(socket.id).emit(Object.keys(io['sockets']['adapter']['rooms'][data.sessionName]).length);
    })
});
