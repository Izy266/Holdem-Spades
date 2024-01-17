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

function parseCard(card) {
    const suiteConv = ['♣', '♥', '♠', '♦'];
    const rankConv = ['J', 'Q', 'K', 'A'];
    let suite = suiteConv[card[1]];
    let rank = card[0];
    
    if (rank > 10) {
        rank = rankConv[rank - 11];
    } else {
        rank = rank.toString();
    }

    return [rank, suite];
}

function makeCard(card) {
    const cardFront = document.createElement('div');
    const suiteContainer = document.createElement('div');
    const cardSuite = document.createElement('p');
    const cardRank = document.createElement('p');

    suiteContainer.appendChild(cardSuite);
    cardFront.appendChild(cardRank);
    cardFront.appendChild(suiteContainer);
    cardFront.setAttribute('id', card);

    card = parseCard(card);
    rank = card[0]
    suite = card[1]
    cardRank.innerHTML = rank;
    cardSuite.innerHTML = suite;

    if (['♥', '♦'].includes(suite)) {
        cardFront.className = "card card_front card_red";
    } else {
        cardFront.className = "card card_front";
    }

    return cardFront;
}

function makeFlipCard(card, delay) {
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

    setTimeout(function () {
        flipCard.classList.add('flip');
    }, delay);
    cardLogo.src = "../static/img/logo4.svg";
    return flipCard;
}

function curPlayer(players) {
    return players.find(function (player) {
        return player.current;
    });
}

function getPlayer(players, id) {
    return players.find(function (player) {
        return player.id == id;
    });
}

document.addEventListener('DOMContentLoaded', () => {
    const socket = io();
    const gameId = window.location.pathname.split('/').pop();
    const playerId = getCookie('player_id');
    const cbfContainer = document.getElementById("cbf_container");
    const raiseContainer = document.getElementById("raise_container");
    const pot = document.getElementById("game_pot");
    const comCards = document.getElementById("com_cards");
    const playerList = document.getElementById('player_list');
    const curPlayerInfo = document.getElementById('cur_player_info');
    const checkFold = document.getElementById("check_fold");
    
    let players = null;

    socket.on('connect', () => {
        socket.emit('join', { gameId: gameId, playerId: playerId });
        socket.emit('playerAction', { gameId: gameId, playerId: playerId, action: 'none' });
    });

    socket.on('player_list', function (data) {
        players = JSON.parse(data);
        const playerExists = players.some(player => player.id === playerId);
        
        
        if (!playerExists) {
            window.location.href = '/join/' + gameId;
        }

        players.forEach(player => {
            let playerInfo = document.getElementById(player.id);

            if (playerInfo == null) {
                playerInfo = document.createElement('div');
                balanceContainer = document.createElement('div');
                playerInfo.setAttribute('id', player.id);
                
                const playerBalance = document.createElement('div');
                
                const playerName = document.createElement('div');
                const playerHand = document.createElement('div');
                const pipContainer = document.createElement('div');

                playerName.innerHTML = player.name;

                playerInfo.setAttribute('class', 'player_info')
                playerBalance.setAttribute("class", "player_balance value_container");
                playerBalance.setAttribute("id", `balance_${player.id}`);
                pipContainer.setAttribute('class', 'pip_container');
                pipContainer.setAttribute("id", `pip_${player.id}`);
                
                playerName.setAttribute("class", "player_name");
                playerHand.setAttribute("class", "player_hand");

                playerInfo.appendChild(playerName);
                playerInfo.appendChild(playerHand);
                playerInfo.appendChild(playerBalance);

                if (player.id == playerId) {
                    curPlayerInfo.appendChild(pipContainer);
                    curPlayerInfo.appendChild(playerInfo);
                } else {
                    playerList.appendChild(playerInfo);
                    playerInfo.appendChild(pipContainer);
                }
            }

            const pipContainer = document.getElementById(`pip_${player.id}`);
            const playerInPot = document.createElement('div');
            const playerHand = playerInfo.querySelector('.player_hand')
            playerInPot.setAttribute("class", "player_in_pot value_container");
            pipContainer.innerHTML = "";

            if (player.current) {
                playerHand.style.backgroundColor = "rgb(255,0,0,0.3)";
                playerHand.style.boxShadow = "0px 0px 40px 30px rgb(255,0,0,0.3)";

            } else {
                playerHand.style.backgroundColor = "rgb(0,0,0,0)";
                playerHand.style.boxShadow = "none";
            }

            if (player.in_pot > 0) {
                playerInPot.innerHTML = `-$${player.in_pot}`;
                pipContainer.appendChild(playerInPot);
            } 
            
            const playerBalance = document.getElementById(`balance_${player.id}`);
            playerBalance.innerHTML = `$${player.balance}`;

            if (!player.live) {
                playerInfo.style.opacity = "0.2";
                if (player.id == playerId) {
                    cbfContainer.style.opacity = "0.2";
                }
            } else {
                playerInfo.style.opacity = "1";
                if (player.id == playerId) {
                    cbfContainer.style.opacity = "1";
                }
            }
        });
    });

    socket.on(`player_hand`, function (curPlayer) {
        players.forEach(player => {
            const playerInfo = document.getElementById(player.id);
            const playerHand = playerInfo.querySelector('.player_hand');
            const bestHand = document.getElementById('best_hand');
            let delay = 0;
            if (playerHand.innerHTML == '') {
                if (player.id == playerId) {
                    curPlayer.cards.forEach(card => {
                        delay += 300;
                        playerHand.appendChild(makeFlipCard(card, delay));
                    });
                } else {
                    for (let i = 0; i < 2; i++) {
                        let cardBack = document.createElement('div');
                        let cardLogo = document.createElement('img');
                        cardLogo.src = "../static/img/logo4.svg";
                        cardBack.appendChild(cardLogo);
                        cardBack.setAttribute('class', 'card card_back');
                        playerHand.appendChild(cardBack);
                    }
                }
            }
            if (player.id == playerId) {
                bestHand.innerHTML = '';
                for (let i = 0; i < curPlayer.best_hand.length; i++) {
                    bestHand.appendChild(makeCard(curPlayer.best_hand[i]));
                }
            }
        });
    });

    socket.on('game_info', function (game) {
        let delay = 0;
        const currentPlayer = curPlayer(players);
        pot.innerHTML = `Pot: $${game.pot}`;
        raiseContainer.innerHTML = '';
        checkFold.innerHTML = '';

        if (!game.live) {
            if (playerId == game.creator_id) {
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
            return;
        }

        if (game.hand_over) {
            const showButton = document.createElement('button');
            
            showButton.setAttribute("class", "common_button");
            showButton.setAttribute("id", "show_button");
        
            checkFold.appendChild(showButton);
        
            showButton.addEventListener("click", function () {
                if (currentPlayer.id == playerId) {
                    checkFold.removeChild(showButton);
                    socket.emit('playerAction', { gameId: gameId, playerId: playerId, action: 'check' });
                }
            });
            
            players.forEach(player => {
                if (player.profit > 0) {
                    let pipContainer = document.getElementById(`pip_${player.id}`);
                    let playerProfit = document.createElement('div');
                    
                    playerProfit.setAttribute('class', 'player_profit value_container');
                    pipContainer.appendChild(playerProfit);
                    playerProfit.innerHTML = `+$${player.profit}`;
                }    
            });
        
            setTimeout(function() {
                comCards.innerHTML = ""

                socket.emit('handStart', { gameId: gameId });
                socket.emit('playerAction', { gameId: gameId, playerId: playerId, action: 'none' });
                players.forEach(p => {
                    let playerInfo = document.getElementById(playerId);
                    let playerHand = playerInfo.querySelector('.player_hand');
                    playerHand.innerHTML = '';
                    socket.emit('getPlayerHand', { gameId: gameId, playerId: p.id });
                });
            }, 5000);
        } else {
            socket.emit('getPlayerHand', { gameId: gameId, playerId: playerId });

            game.cards.forEach(card => {
                if (!document.getElementById(card)) {
                    delay += 300;
                    comCards.appendChild(makeFlipCard(card, delay));
                }
            });
    
            let callAmount = game.current_bet - getPlayer(players, playerId).in_pot;
            let playerMinBet = Math.min(currentPlayer.balance - currentPlayer.in_pot, game.min_bet + (game.current_bet - currentPlayer.in_pot));
            if (currentPlayer.balance <= game.current_bet - currentPlayer.in_pot) {
                playerMinBet = 0;
            }
            let raiseAmount = playerMinBet;
    
            const checkButton = document.createElement("button");
            const foldButton = document.createElement("button");
            const raiseButton = document.createElement("button");
            const raiseSlider = document.createElement("input");
            
            checkButton.setAttribute("class", "common_button");
            checkButton.setAttribute("id", "check_button");
            foldButton.setAttribute("class", "common_button");
            foldButton.setAttribute("id", "fold_button");
            raiseButton.setAttribute("class", "common_button");
            raiseButton.setAttribute("id", "raise_button");
            raiseSlider.setAttribute("type", "range");
            raiseSlider.setAttribute("min", playerMinBet);
            raiseSlider.setAttribute("max", currentPlayer.balance);
            raiseSlider.setAttribute("value", playerMinBet);
            raiseSlider.setAttribute("id", "raise_slider");
    
            checkFold.appendChild(checkButton);
            checkFold.appendChild(foldButton);
    
            foldButton.innerHTML = "Fold";
            if (callAmount > 0) {
                checkButton.innerHTML = `$${callAmount} Call`;
                raiseButton.innerHTML = `$${playerMinBet} Raise`;
                raiseSlider.oninput = function () {
                    raiseAmount = this.value;
                    raiseButton.innerHTML = `$${raiseAmount} Raise`;
                }
            } else {
                checkButton.innerHTML = "Check";
                raiseButton.innerHTML = `$${playerMinBet} Bet`;
                raiseSlider.oninput = function () {
                    raiseAmount = this.value;
                    raiseButton.innerHTML = `$${raiseAmount} Bet`;
                }
            }
    
            if (currentPlayer.id == playerId & playerMinBet > 0) {
                raiseContainer.appendChild(raiseSlider);
                raiseContainer.appendChild(raiseButton);
            }
    
            checkButton.addEventListener("click", function () {
                if (currentPlayer.id == playerId) {
                    socket.emit('playerAction', { gameId: gameId, playerId: playerId, action: 'check' });
                }
            });
            raiseButton.addEventListener("click", function () {
                if (currentPlayer.id == playerId) {
                    socket.emit('playerAction', { gameId: gameId, playerId: playerId, action: 'bet', amount: raiseAmount });
                }
            });
    
            foldButton.addEventListener("click", function () {
                if (currentPlayer.id == playerId) {
                    socket.emit('playerAction', { gameId: gameId, playerId: playerId, action: 'fold' });
                }
            });
        }
    });
});