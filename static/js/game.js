function getCookie(name) {
    let cookieArr = document.cookie.split(";");

    for(let i = 0; i < cookieArr.length; i++) {
        let cookiePair = cookieArr[i].split("=");

        if(name == cookiePair[0].trim()) {
            return decodeURIComponent(cookiePair[1]);
        }
    }

    return null;
}

document.addEventListener('DOMContentLoaded', () => {
    const socket = io();
    const gameId = window.location.pathname.split('/').pop();
    socket.emit('playerAction', {game_id: gameId, action: 'None'})

    function updateGame() {
        socket.on('get_cur_player', function(data) {
            let cbf = document.getElementById("cbf");
            cbf.innerHTML = "";
            if (data.cur_player === getCookie('player_id')) {
                cbf.innerHTML = `
                    <button id="checkButton">Check</button>
                    <button id="betButton">Bet</button>
                    <button id="foldButton">Fold</button>
                `;
                addEventListeners();
            }
        });
    }

    function addEventListeners() {
        document.getElementById("checkButton").addEventListener("click", function(){
            socket.emit('playerAction', {game_id: gameId, action: 'check'});
            updateGame();
        });

        document.getElementById("betButton").addEventListener("click", function(){
            let betAmount = prompt("Please enter your bet amount:");
            socket.emit('playerAction', {game_id: gameId, action: 'bet', amount: betAmount});
            updateGame();
        });

        document.getElementById("foldButton").addEventListener("click", function(){
            socket.emit('playerAction', {game_id: gameId, action: 'fold'});
            updateGame();
        });
    }

    updateGame();
});
