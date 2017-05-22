// This file implements the Lichess API

// Login to Lichess
function lichessLogin() {
    var xhttp = new XMLHttpRequest();
    var url = "https://en.lichess.org/login";
    var params = "username=" + $('#user').val() + "&password=" + $('#password').val();
    xhttp.open("POST", url, true);
    xhttp.setRequestHeader("Content-type", "application/x-www-form-urlencoded");
    // send the proper header information along with the request
    xhttp.setRequestHeader("Accept", "application/vnd.lichess.v1+json");
    xhttp.onreadystatechange = function () {
        if (this.readyState == 4 && this.status == 200) {
            console.log(xhttp.responseText);
            document.getElementById("loginInfo").style.display = "none";
            document.getElementById("connectInfo").style.display = "none";
            document.getElementById("logoutInfo").style.display = "initial";
            document.getElementById("username").innerText = JSON.parse(xhttp.responseText).username;
        }
        else if (this.readyState == 4 && this.status != 200)
            document.getElementById('loginInfo').style.display = 'initial';
    };
    xhttp.send(params);
}

// Logout from Lichess
function lichessLogout() {
    var xhttp = new XMLHttpRequest();
    var url = "https://en.lichess.org/logout";
    xhttp.open("GET", url, true);

    // send the proper header information along with the request
    xhttp.setRequestHeader("Accept", "application/vnd.lichess.v1+json");
    xhttp.onreadystatechange = function () {
        if (this.readyState == 4 && this.status == 200) {
            console.log(xhttp.responseText);
            $('#user').val("");
            document.getElementById("connectInfo").style.display = "initial";
            document.getElementById("logoutInfo").style.display = "none";
        }
    };
    xhttp.send();
}

//// Get Lichess account info including current games
//// returns true if logged in, false if "unauthorized"
//function getLichessUser() {
//    var xhttp = new XMLHttpRequest();
//    var url = "https://en.lichess.org/account/info/";
//    var bustCache = '?' + new Date().getTime();
//    xhttp.open("GET", url + bustCache, true);

//    // send the proper header information along with the request
//    xhttp.setRequestHeader("Accept", "application/vnd.lichess.v1+json");
//    xhttp.onreadystatechange = function () {
//        if (this.readyState == 4 && this.status == 200) {
//            // status OK --> return true
//            document.getElementById("connectH2").innerHTML = JSON.parse(xhttp.responseText).username + "<br /><span onclick='lichessLogout()'>logout</span>";
//        }
//        else if (this.readyState == 4 && this.status != 200) {
//            // unauthorized --> return false
//            document.getElementById("connectH2").innerHTML = "Connect to<br />lichess";
//        }
//    };
//    xhttp.send();

//}

function createMachineGame() {
    console.log("game with machine requested");
}

function createOTBGame() {
    console.log("otb game requested");
}

writer = null;

pinger = null;

lastMove = null;

latestMove = null;

function gameConnect(fullID) {

    if (pinger == null) {

        pinger = "pinger not null now";

        window.currentGame = fullID;

        // ---------------- Store Game Info ----------------- //

        var xhttp = new XMLHttpRequest();
        var url = "https://en.lichess.org/" + currentGame;
        xhttp.open("GET", url, true);

        xhttp.setRequestHeader("Accept", "application/vnd.lichess.v1+json");
        xhttp.onreadystatechange = function () {
            if (this.readyState == 4 && this.status == 200) {
                gameInfo = JSON.parse(xhttp.responseText);
                startGame();
            }
        };
        xhttp.send();

        // -------------------------------------------------- //

        function startGame() {

            window.version = gameInfo.player.version;

            window.gameId = gameInfo.game.id;

            dests = gameInfo.possibleMoves;

            player = gameInfo.game.player;
            myColor = gameInfo.player.color;

            var baseUrl = gameInfo.url.socket; // obtained from game creation API (`url.socket`)
            clientId = Math.random().toString(36).substring(2); // created and stored by the client

            var socketUrl = 'wss://socket.lichess.org:9026' + baseUrl + '?sri=' + clientId;

            window.awaitingAck = false;

            window.sentMove = null;

            window.socket = new WebSocket(socketUrl);

            socket.onopen = function () {

                window.pinger = setInterval(function () {

                    ping();

                }, 2000);

            };

            socket.onmessage = function (event) {


                console.log(event.data);

                var eventData = JSON.parse(event.data);

                if (eventData.hasOwnProperty("t")) {
                    if (eventData.t == "b") {
                        for (var i = 0; i < eventData.d.length; i++)
                            digestMSG(eventData.d[i]);
                    }
                    else
                        digestMSG(eventData);
                }
            };

            socket.onerror = function () {
                console.log('error occurred!');
            };

            socket.onclose = function (event) {
                clearInterval(pinger);
                pinger = null;

                console.log("socketClosed!");

            };

            try {
                syncFEN();
            }
            catch (err) {
            }

        }
    }
}




let dests = new Object();

var writeSource;
var writeTarget;

var squares = ["a1", "b1", "c1", "d1", "e1", "f1", "g1", "h1",
                "a2", "b2", "c2", "d2", "e2", "f2", "g2", "h2",
                "a3", "b3", "c3", "d3", "e3", "f3", "g3", "h3",
                "a4", "b4", "c4", "d4", "e4", "f4", "g4", "h4",
                "a5", "b5", "c5", "d5", "e5", "f5", "g5", "h5",
                "a6", "b6", "c6", "d6", "e6", "f6", "g6", "h6",
                "a7", "b7", "c7", "d7", "e7", "f7", "g7", "h7",
                "a8", "b8", "c8", "d8", "e8", "f8", "g8", "h8", ];

var data2 = new Uint8Array(1);

var lightLED = function () {
    if (data2[0] == writeSource)
        data2[0] = writeTarget;
    else
        data2[0] = writeSource;
    //console.log("I should be writing " + data2[0] + " to: " + device_id + " and service_id: " + service_id + " and with char_id: " + characteristic_id);

    ble.write(device_id, service_id, characteristic_id, data2.buffer);
}

function sendMove(source, target) {

    var move = {
        t: 'move',
        d: {
            from: source,
            to: target
        }
    };

    window.sentMove = source + target;

    sentMove = source + target;

    socket.send(JSON.stringify(move));
    console.log("move sent to lichess!");
    window.awaitingAck = true;



}



function syncFEN() {
    var xhttp = new XMLHttpRequest();
    var url = "https://en.lichess.org/" + currentGame;
    xhttp.open("GET", url, true);

    xhttp.setRequestHeader("Content-type", "application/x-www-form-urlencoded");
    // send the proper header information along with the request
    xhttp.setRequestHeader("Accept", "application/vnd.lichess.v1+json");
    xhttp.onreadystatechange = function () {
        if (this.readyState == 4 && this.status == 200) {
            var currentFEN = JSON.parse(xhttp.responseText).game.fen;
            version = JSON.parse(xhttp.responseText).player.version;
            console.log(currentFEN);
        }
    };
    xhttp.send();
}

function ping() {

    socket.send(JSON.stringify({
        t: 'p',
        v: version
    }));

    console.log(JSON.stringify({
        t: 'p',
        v: version
    }));

}

function digestMSG(eventData) {

    if (eventData.t != "n") {

        if (awaitingAck && eventData.t != "ack") {
            console.log("resending move...");
            sendMove();
        }
        else if (awaitingAck && eventData.t == "ack") {

            awaitingAck = false;
        }
        if (eventData.t == "resync") {
            console.log("resync message received!");
            syncFEN();

        }
        else if (eventData.t == "move") {

            latestMove = eventData.d.uci;

            dests = eventData.d.dests;

            player = (eventData.d.ply % 2 == 1) ? 'black' : 'white';

        }

        else if (eventData.t == "reload")
            syncFEN();

        if (eventData.hasOwnProperty("v")) {
            version = eventData.v;
        }
        if (latestMove != null)
            if (player == myColor) {

                if (clearInterval(writer)); // make sure cleared before setting
                writer = setInterval(lightLED, 250);

                writeSource = squares.indexOf(latestMove.slice(0, 2));
                writeTarget = squares.indexOf(latestMove.slice(2, 4));
            }
    }

}
