function getCookie(name) {
    let cookieArr = document.cookie.split(";");

    for (let i = 0; i < cookieArr.length; i++) {
        let cookiePair = cookieArr[i].split("=");

        if (name == cookiePair[0].trim()) {
            return decodeURIComponent(cookiePair[1]);
        }
    }

    return null;
}

document.addEventListener('DOMContentLoaded', () => {
    const socket = io();
    const gameId = window.location.pathname.split('/').pop();
    const cbf = document.getElementById("cbf");
    const pot = document.getElementById("pot");
    const cards = document.getElementById("cards");
    const balance = document.getElementById("playerList");
    const suits = ['clubs', 'diamonds', 'hearts', 'spades'];

    socket.emit('getGameInfo', { gameId: gameId });
    socket.emit('getPlayers', { gameId: gameId });

    socket.on('player_list', function (data) {
        const players = JSON.parse(data);
        const playerList = document.getElementById('playerList');

        // Clear the list
        playerList.innerHTML = '';

        // Add each player to the list
        players.forEach(function (player) {
            const playerInfo = document.createElement('p');
            playerInfo.textContent = player.name + ': ' + player.balance;
            playerList.appendChild(playerInfo);
        });
    });

    socket.on('game_info', function (data) {
        cbf.innerHTML = "";
        cards.innerHTML = "";
        pot.innerHTML = `Pot: ${data.pot}`;

        data.cards.forEach(card => {
            let suite = suits[card[1]];
            let rank = card[0];

            if (rank == 11) {
                rank = 'jack';
            } else if (rank == 12) {
                rank = 'queen';
            } else if (rank == 13) {
                rank = 'king';
            } else if (rank == 14) {
                rank = 'ace';
            }

            const imgPath = `https://tekeye.uk/playing_cards/images/svg_playing_cards/fronts/${suite}_${rank}.svg`;
            const imgElement = document.createElement('img');
            imgElement.src = imgPath;
            cards.appendChild(imgElement);
        });

        if (data.cur_player_id === getCookie('player_id')) {
            cbf.innerHTML = `
                <button id="checkButton">Check</button>
                <input type="number" id="betAmount" min="1">
                <button id="betButton">Bet</button>
                <button id="foldButton">Fold</button>
            `;

            const checkButton = document.getElementById("checkButton");
            checkButton.addEventListener("click", function () {
                socket.emit('playerAction', { gameId: gameId, action: 'check' });
                cbf.innerHTML = "";
            });

            const betButton = document.getElementById("betButton");
            betButton.addEventListener("click", function () {
                let betAmount = document.getElementById("betAmount").value;
                socket.emit('playerAction', { gameId: gameId, action: 'bet', amount: betAmount });
                cbf.innerHTML = "";
            });

            const foldButton = document.getElementById("foldButton");
            foldButton.addEventListener("click", function () {
                socket.emit('playerAction', { gameId: gameId, action: 'fold' });
                cbf.innerHTML = "";
            });
        }
    });
});