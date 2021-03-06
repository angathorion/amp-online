var Client = function(Client, $, undefined) {
    Client.state = null;
    // Initialize variables
    var $window = $(window);
    var $nicknameInput = $('#nickname'); // Input for username
    var $sessionInput = $('#session'); // Input for username

    var $loginPage = $('.login.page'); // The login page
    var $playerScoresheet = $('#scoresheet');
    var $collaboratorScoresheet = $('#collaborator_scoresheet');
    var $playParameters = $('#play_parameters');

    // Prompt for setting a username
    var username;
    var sessionName = "";

    var connected = false;

    var socket = io();

    var waitForHeartbeat = false;
    var inRoom = false;

    // Sets the client's username
    function tryJoinSession () {
        username = cleanInput($nicknameInput.val().trim());
        sessionName = cleanInput($sessionInput.val().trim());

        // If the username is valid
        if (username && sessionName) {
            $loginPage.off('click');

            // Join session with username
            socket.emit('subscribe', {username: username, sessionName: sessionName});
            socket.emit('init', {username: username, sessionName: sessionName});
            $loginPage.fadeOut();
        }
    }

    // Prevents input from having injected markup
    function cleanInput (input) {
        return $('<div/>').text(input).text();
    }

    // Keyboard events
    $window.keydown(function (event) {
        // When the client hits ENTER on their keyboard
        if (event.which === 13) {
            if (!inRoom) {
                tryJoinSession();
            }
        }
    });

    // Socket events
    socket.on('start', function () {
        inRoom = true;
        anticipatoryMusicProducer.init();
        $playerScoresheet.fadeIn();
        $collaboratorScoresheet.fadeIn();
        $playParameters.fadeIn();
    });

    var slower = null;

    socket.on('receive_midi_signals', function (data) {
        console.log(data.midiSignals[1]);
        anticipatoryMusicProducer.Scheduler.playBar($.extend({}, data.midiSignals[1]), data.instrumentName, 0);
    });

    socket.on('receive_canvas', function (data) {
        var quantized_bars = JSON.parse(data.quantizedBars);
        quantized_bars.forEach(function(bar) {
            bar.barObjects.forEach(function(bar_object) {
                bar_object.note.toString = Palette.Note.prototype.toString;
                bar_object.note.letter = Palette.Note.prototype.letter;
                bar_object.note.accidental = Palette.Note.prototype.accidental;
            });
        });
        var theirDrawOffset = data.offset;
        Client.state = { bars: quantized_bars, midiSignals: data.midiSignals,
            drawOffset: theirDrawOffset, barLag: data.barLag };
    });

    socket.on('wait_for_heartbeat', function() {
        console.log('waiting for heartbeat');
        waitForHeartbeat = true;
    });

    socket.on('user joined', function (data) {
        console.log(data.username + ' joined ' + data.sessionName);
    });

    socket.on('user left', function (data) {
        console.log(data.username + ' left ' + data.sessionName);
    });

    socket.on('heartbeat', function (data) {
        if (!inRoom && waitForHeartbeat) {
            inRoom = true;
            waitForHeartbeat = false;
            anticipatoryMusicProducer.init();
            $playerScoresheet.fadeIn();
            $collaboratorScoresheet.fadeIn();
            $playParameters.fadeIn();
        }
    });
};

Client(window.anticipatoryMusicProducer.Client =
    window.anticipatoryMusicProducer.Client || {}, jQuery);
