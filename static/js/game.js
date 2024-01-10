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

function getCardImgUrl(card) {
    const suits = ['clubs', 'diamonds', 'hearts', 'spades'];
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

    return `https://tekeye.uk/playing_cards/images/svg_playing_cards/fronts/${suite}_${rank}.svg`;
}

document.addEventListener('DOMContentLoaded', () => {
    const socket = io();
    const gameId = window.location.pathname.split('/').pop();
    const playerId = getCookie('player_id');
    const cbf = document.getElementById("cbf");
    const pot = document.getElementById("pot");
    const cards = document.getElementById("cards");
    const playerList = document.getElementById('playerList');

    socket.on('connect', () => {
        socket.emit('join', { gameId: gameId, playerId: playerId });
        socket.emit('playerAction', { gameId: gameId, playerId: playerId, action: 'none' });
        socket.emit('getPlayerHand', { gameId: gameId, playerId: playerId });
    });

    socket.on('player_list', function (data) {
        const players = JSON.parse(data);

        players.forEach(function (player) {
            let playerInfo = document.getElementById(player.id);

            if (playerInfo === null) {
                playerInfo = document.createElement('div');
                playerInfo.setAttribute('id', player.id);

                const playerBalance = document.createElement('div');
                const playerName = document.createElement('div');
                const playerHand = document.createElement('div');

                for (let i = 0; i < 2; i++) {
                    let cardBack = document.createElement('img');
                    cardBack.src = "https://tekeye.uk/playing_cards/images/svg_playing_cards/backs/blue2.svg";
                    playerHand.appendChild(cardBack);
                }

                playerName.innerHTML = player.name;
                playerBalance.className = "playerBalance";
                playerName.className = "playerName";
                playerHand.className = "playerHand";

                playerInfo.appendChild(playerBalance);
                playerInfo.appendChild(playerName);
                playerInfo.appendChild(playerHand);
                playerList.appendChild(playerInfo);
            }

            playerBalance = playerInfo.querySelector('.playerBalance')
            playerBalance.innerHTML = `$${player.balance}`
        });
    });

    socket.on(`player_hand`, function (data) {
        const playerInfo = document.getElementById(playerId);
        const playerHand = playerInfo.querySelector('.playerHand');
        playerHand.innerHTML = '';
        data.cards.forEach(card => {
            const cardFront = document.createElement('img');
            cardFront.src = getCardImgUrl(card);
            playerHand.appendChild(cardFront);
        });
    });

    socket.on('game_info', function (data) {
        cbf.innerHTML = "";
        cards.innerHTML = "";
        pot.innerHTML = `Pot: ${data.pot}`;

        data.cards.forEach(card => {
            const imgElement = document.createElement('img');
            imgElement.src = getCardImgUrl(card);
            cards.appendChild(imgElement);
        });

        if (data.cur_player_id === playerId) {
            cbf.innerHTML = `
                <button id="checkButton">Check</button>
                <input type="number" id="betAmount" min="1">
                <button id="betButton">Bet</button>
                <button id="foldButton">Fold</button>
            `;

            const checkButton = document.getElementById("checkButton");
            checkButton.addEventListener("click", function () {
                socket.emit('playerAction', { gameId: gameId, playerId: playerId, action: 'check' });
                cbf.innerHTML = "";
            });

            const betButton = document.getElementById("betButton");
            betButton.addEventListener("click", function () {
                let betAmount = document.getElementById("betAmount").value;
                socket.emit('playerAction', { gameId: gameId, playerId: playerId, action: 'bet', amount: betAmount });
                cbf.innerHTML = "";
            });

            const foldButton = document.getElementById("foldButton");
            foldButton.addEventListener("click", function () {
                socket.emit('playerAction', { gameId: gameId, playerId: playerId, action: 'fold' });
                cbf.innerHTML = "";
            });
        }
    });
});