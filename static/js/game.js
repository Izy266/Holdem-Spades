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

function makeCard(card) {
    const cardFront = document.createElement('div');
    const suiteContainer = document.createElement('div');
    const cardSuite = document.createElement('p');
    const cardRank = document.createElement('p');
    const suiteConv = ['♣', '♥', '♠', '♦'];
    const rankConv = ['J', 'Q', 'K', 'A'];

    suiteContainer.appendChild(cardSuite);
    cardFront.appendChild(cardRank);
    cardFront.appendChild(suiteContainer);

    let suite = suiteConv[card[1]];
    let rank = card[0];

    if (rank > 10) {
        rank = rankConv[rank - 11];
    } else {
        rank = rank.toString();
    }

    cardRank.innerHTML = rank;
    cardSuite.innerHTML = suite;

    if (['♥', '♦'].includes(suite)) {
        cardFront.className = "card card_front card_red";
    } else {
        cardFront.className = "card card_front";
    }

    return cardFront;
}

document.addEventListener('DOMContentLoaded', () => {
    const socket = io();
    const gameId = window.location.pathname.split('/').pop();
    const playerId = getCookie('player_id');
    const cbf = document.getElementById("cbf");
    const pot = document.getElementById("pot");
    const cards = document.getElementById("cards");
    const playerList = document.getElementById('player_list');

    socket.on('connect', () => {
        socket.emit('join', { gameId: gameId, playerId: playerId });
        socket.emit('playerAction', { gameId: gameId, playerId: playerId, action: 'none' });
    });

    socket.on('player_list', function (data) {
        const players = JSON.parse(data);
        const playerExists = players.some(player => player.id === playerId);

        if (!playerExists) {
            window.location.href = '/join/' + gameId;
        }

        players.forEach(player => {
            let playerInfo = document.getElementById(player.id);

            if (playerInfo === null) {
                playerInfo = document.createElement('div');
                playerInfo.setAttribute('id', player.id);

                const playerBalance = document.createElement('div');
                const playerName = document.createElement('div');
                const playerHand = document.createElement('div');

                for (let i = 0; i < 2; i++) {
                    let cardBack = document.createElement('div');
                    let cardLogo = document.createElement('img');
                    cardLogo.src = "../static/img/logo4.svg";
                    cardBack.appendChild(cardLogo);
                    cardBack.setAttribute('class', 'card card_back');
                    playerHand.appendChild(cardBack);
                }

                playerName.innerHTML = player.name;
            
                playerInfo.setAttribute('class', 'player_info')
                playerBalance.setAttribute("class", "player_balance value_container");
                playerName.setAttribute("class", "player_name");
                playerHand.setAttribute("class", "player_hand");

                playerInfo.appendChild(playerName);
                playerInfo.appendChild(playerHand);
                playerInfo.appendChild(playerBalance);
                playerList.appendChild(playerInfo);
            }

            if (player.current) {
                playerInfo.style.border = "1px solid rgb(0, 0, 0, 0.1)";
                playerInfo.style.backgroundColor = "rgb(0, 100, 0, 0.2)"; 
                playerInfo.style.boxShadow = "rgba(100, 0, 0, 0.6) 0px 7px 29px 0px";
            } else {
                playerInfo.style.border = ""; 
                playerInfo.style.backgroundColor = ""; 
                playerInfo.style.boxShadow = "";
            }
            console.log(player.creator)
            const playerBalance = playerInfo.querySelector('.player_balance')
            playerBalance.innerHTML = `Balance: $${player.balance}`
        });
    });

    socket.on(`player_hand`, function (data) {
        const playerInfo = document.getElementById(playerId);
        const playerHand = playerInfo.querySelector('.player_hand');
        playerHand.innerHTML = '';
        data.cards.forEach(card => {
            const cardFront = makeCard(card);
            playerHand.appendChild(cardFront);
        });
    });

    socket.on('game_info', function (data) {
        let delay = 0;
        cbf.innerHTML = "";
        cards.innerHTML = "";
        pot.innerHTML = `Pot: ${data.pot}`;

        if (data.live) {
            socket.emit('getPlayerHand', { gameId: gameId, playerId: playerId });
        } else if (playerId == data.creator_id) {
            const startContainer = document.getElementById("start_container");
            const startButton = document.createElement("button");
            startContainer.innerHTML = "";
            startButton.setAttribute("id", "start_game_button");
            startButton.setAttribute("class", "common_button");
            startButton.innerHTML = "Start Game";
            startContainer.appendChild(startButton);
            startButton.addEventListener("click", () => {
                socket.emit('handStart', { gameId: gameId });
                startContainer.removeChild(startButton);
                socket.emit('playerAction', { gameId: gameId, playerId: playerId, action: 'none' });
                players.forEach(p => {
                    socket.emit('getPlayerHand', { gameId: gameId, playerId: p.id });
                });
            });
        }

        data.cards.forEach(card => {
            const tableCard = makeCard(card);
            const flipCard = document.createElement('div');
            const flipCardInner = document.createElement('div');
            const flipCardFront = document.createElement('div');
            const flipCardBack = document.createElement('div');
            const cardBack = document.createElement('div');
            const cardLogo = document.createElement('img');

            cardBack.setAttribute('class', 'card card_back');
            flipCard.setAttribute('class', 'flip-card');
            flipCardInner.setAttribute('class', 'flip-card-inner');
            flipCardFront.setAttribute('class', 'flip-card-front');
            flipCardBack.setAttribute('class', 'flip-card-back');

            flipCard.appendChild(flipCardInner);
            flipCardInner.appendChild(flipCardFront);
            flipCardInner.appendChild(flipCardBack);
            flipCardFront.appendChild(cardBack);
            flipCardBack.appendChild(tableCard);
            cardBack.appendChild(cardLogo);
            cards.appendChild(flipCard);
            
            delay += 300;

            setTimeout(function () {
                flipCard.classList.add('flip');
            }, delay); 

            cardLogo.src = "../static/img/logo4.svg";

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