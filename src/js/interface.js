(function (Interface, $, undefined) {
    // private properties
    var log = console.log.bind(console),
        midi;
    var AudioContext = window.AudioContext || webkitAudioContext; // for ios/safari
    var context = new AudioContext();
    var noteOnListeners = [];
    var noteOffListeners = [];
    // private method
    // request MIDI access
    if (navigator.requestMIDIAccess) {
        navigator.requestMIDIAccess({
            sysex: false
        }).then(onMIDISuccess, onMIDIFailure);
    } else {
        alert("No MIDI support in your browser.");
    }
    Interface.listInputs = function (inputs) {
        var input = inputs.value;
        log("Input port : [ type:'" + input.type + "' id: '" + input.id +
            "' manufacturer: '" + input.manufacturer + "' name: '" + input.name +
            "' version: '" + input.version + "']");
    };

    Interface.addNoteOnListener = function (listener) {
        noteOnListeners.push(listener);
    };

    Interface.addNoteOffListener = function (listener) {
        noteOffListeners.push(listener);
    };

    // midi functions
    function onMIDISuccess(midiAccess) {
        midi = midiAccess;
        var inputs = midi.inputs.values();
        // loop through all inputs
        for (var input = inputs.next(); input && !input.done; input = inputs.next()) {
            // listen for midi messages
            input.value.onmidimessage = onMIDIMessage;
            // this just lists our inputs in the console
            Interface.listInputs(input);
        }
        console.log(inputs);

        var outputs = [];
        var iter = midi.outputs.values();
        for (var i = iter.next(); i && !i.done; i = iter.next()) {
            outputs.push(i.value);
        }
        console.log(outputs);
        // listen for connect/disconnect message
        midi.onstatechange = onStateChange;
    }

    Interface.reloadMIDIInstruments = function () {
        var instrumentNameSelector = document.getElementById("instrument_name");
        var instrumentName = "acoustic_grand_piano";
        if (instrumentNameSelector) {
            instrumentName = instrumentNameSelector.options[instrumentNameSelector.selectedIndex].value;
        }
        MIDI.loadPlugin({
            soundfontUrl: "./soundfont/",
            instrument  : instrumentName,
            onprogress  : function (state, progress) {},
            onsuccess   : function (note, velocity) {
                MIDI.programChange(0, MIDI.GM.byName[instrumentName].number);
            }
        });
    };

    Interface.reloadMIDIInstruments();

    function onMIDIMessage(event) {
        var data, cmd, channel, type, note, velocity;
        data = event.data,
            cmd = data[0] >> 4,
            channel = data[0] & 0xf,
            type = data[0] & 0xf0, // channel agnostic message type. Thanks, Phil Burk.
            note = data[1],
            velocity = data[2];
        // with pressure and tilt off
        // note off: 128, cmd: 8
        // note on: 144, cmd: 9
        // pressure / tilt on
        // pressure: 176, cmd 11:
        // bend: 224, cmd: 14

        var midiChannelSelector = document.getElementById("midi_channel");
        var midiChannel = midiChannelSelector.options[midiChannelSelector.selectedIndex].value;
        if (midiChannel == channel) {
            switch (type) {
                case 144: // noteOn message
                    noteOnListeners.forEach(function (item) {
                        item.call(item.scope, note, velocity, performance.now());
                    });
                    MIDI.setVolume(0, 127);
                    MIDI.noteOn(0, note, velocity, 0);
                    break;
                case 128: // noteOff message
                    noteOffListeners.forEach(function (item) {
                        item.call(item.scope, note, performance.now());
                    });
                    MIDI.noteOff(0, note, 0);
                    break;
            }
            logger('key data', data);
        }
    }

    function onStateChange(event) {
        var port  = event.port,
            state = port.state,
            name  = port.name,
            type  = port.type;
        if (type == "input") console.log("name", name, "port", port, "state", state);
    }

    function onMIDIFailure(e) {
        log("No access to MIDI devices or your browser doesn't support WebMIDI API. Please use WebMIDIAPIShim " + e);
    }

    // audio functions
    function loadAudio(object, url) {
        var request = new XMLHttpRequest();
        request.open('GET', url, true);
        request.responseType = 'arraybuffer';
        request.onload = function () {
            context.decodeAudioData(request.response, function (buffer) {
                object.buffer = buffer;
            });
        };
        request.send();
    }

    // utility functions
    function randomRange(min, max) {
        return Math.random() * (max + min) + min;
    }

    function rangeMap(x, a1, a2, b1, b2) {
        return ((x - a1) / (a2 - a1)) * (b2 - b1) + b1;
    }

    function frequencyFromNoteNumber(note) {
        return 440 * Math.pow(2, (note - 69) / 12);
    }

    function logger(label, data) {
        var messages = label + " [channel: " + (data[0] & 0xf) + ", cmd: " + (data[0] >> 4) + ", type: " + (data[0] & 0xf0) + " , note: " + data[1] + " , velocity: " + data[2] + "]";
        console.log(messages);
    }
})(window.anticipatoryMusicProducer.Interface =
    window.anticipatoryMusicProducer.Interface || {}, jQuery);
