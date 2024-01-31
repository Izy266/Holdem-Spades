function getCookie(name) {
    let cookieArr = document.cookie.split(';');
    for (let i = 0; i < cookieArr.length; i++) {
        let cookiePair = cookieArr[i].split('=');
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

function makeCardFront(card) {
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
        cardFront.className = 'card card_front card_red';
    } else {
        cardFront.className = 'card card_front';
    }

    return cardFront;
}

function makeCardBack() {
    const cardBack = document.createElement('div');
    const cardLogo = document.createElement('img');

    cardBack.setAttribute('class', 'card card_back');
    cardLogo.src = '../static/img/logo4.svg';
    cardBack.appendChild(cardLogo);
    return cardBack;
}

function makeCardFlip(card, delay) {
    const flipCard = document.createElement('div');
    const flipCardInner = document.createElement('div');
    const flipCardFront = document.createElement('div');
    const flipCardBack = document.createElement('div');

    flipCard.setAttribute('id', card);
    flipCard.setAttribute('class', 'card flip-card');
    flipCardInner.setAttribute('class', 'flip-card-inner');
    flipCardFront.setAttribute('class', 'flip-card-front');
    flipCardBack.setAttribute('class', 'flip-card-back');

    flipCard.appendChild(flipCardInner);
    flipCardInner.appendChild(flipCardFront);
    flipCardInner.appendChild(flipCardBack);
    flipCardFront.appendChild(makeCardBack());
    flipCardBack.appendChild(makeCardFront(card));

    setTimeout(function () {
        flipCard.classList.add('flip');
    }, delay);

    return flipCard;
}

function makePlayer(player) {
    const infoContainer = document.createElement('div');
    const playerInfoContainer = document.createElement('div');
    const playerInfo = document.createElement('div');
    const name = document.createElement('div');
    const hand = document.createElement('div');
    const balance = document.createElement('div');

    infoContainer.setAttribute('id', player.id);
    infoContainer.setAttribute('class', 'info_container');
    playerInfoContainer.setAttribute('class', 'player_info_container');
    playerInfo.setAttribute('class', 'player_info');
    name.setAttribute('class', 'player_name');
    hand.setAttribute('class', 'player_hand');
    balance.setAttribute('class', 'player_balance value_container');

    playerInfo.appendChild(name);
    playerInfo.appendChild(hand);
    playerInfo.appendChild(balance);
    playerInfoContainer.appendChild(playerInfo);
    infoContainer.appendChild(playerInfoContainer);

    name.innerHTML = player.name;
    balance.innerHTML = `$${player.balance}`;

    return infoContainer;
}

function parseLog(line) {
    let mainLog = line[0];
    if (mainLog == 'new_hand') {
        return '---------------------';
    } else if (mainLog == 'small_blind') {
        return `<b>${line[1]}</b> posted small blind $${line[2]}`;
    } else if (mainLog == 'big_blind') {
        return `<b>${line[1]}</b> posted big blind $${line[2]}`;
    } else if (mainLog == 'raise') {
        return `<b>${line[1]}</b> raised $${line[2]}`;
    } else if (mainLog == 'call') {
        return `<b>${line[1]}</b> called $${line[2]}`;
    } else if (mainLog == 'all_in') {
        return `<b>${line[1]}</b> went all in $${line[2]}`;
    } else if (mainLog == 'check') {
        return `<b>${line[1]}</b> checked`;
    } else if (mainLog == 'fold') {
        return `<b>${line[1]}</b> folded`;
    } else if (mainLog == 'win') {
        let cards = line[3].map(parseCard);
        cards = cards.map(card => card.join('')).join(' ');
        return `<b>${line[1]}</b> wins $${line[2]} ${cards}`;
    } else if (mainLog == 'flop') {
        let cards = line[1].map(parseCard);
        cards = cards.map(card => card.join('')).join(' ');
        return `Dealing the Flop: ${cards}`;
    } else if (mainLog == 'turn') {
        let card = parseCard(line[1][0]);
        card = card.join('');
        return `Dealing the Turn: ${card}`;
    } else if (mainLog == 'river') {
        let card = parseCard(line[1][0]);
        card = card.join('');
        return `Dealing the River: ${card}`;
    } else if (mainLog == 'leave') {
        return `<b>${line[1]}</b> left the game`;
    } else if (mainLog == 'join') {
        return `<b>${line[1]}</b> joined the game`;
    }
}

const socket = io();
const gameId = window.location.pathname.split('/').pop();
const playerId = getCookie('player_id');
const sessionId = getCookie('session_id');
const scoreRanking = ['High Card', 'Pair', 'Two Pair', 'Three of a Kind', 'Straight', 'Flush', 'Full House', 'Four of a Kind', 'Straight Flush'];

let players = null;
let gameHand = 0;

socket.on('connect', () => {
    socket.emit('join', { gameId: gameId, playerId: playerId, sessionId: sessionId }, (response) => {
        if (!response) {
            socket.emit('playerAction', { gameId: gameId, playerId: playerId, sessionId: sessionId, action: 'none' });
            socket.emit('playerChat', { gameId: gameId, playerId: playerId, sessionId: sessionId, input: '', new: true })
        } else {
            window.location.href = '/join/' + response.gameId;
        }
    });
});

socket.on('player_list', playerData => {
    players = JSON.parse(playerData);
    players = players.filter(player => player.in_game);
});

socket.on('game_info', game => {
    const gameButtonContainer = document.getElementById('game_button_container');
    const playerList = document.getElementById('player_list');
    const pot = document.getElementById('game_pot');
    const choiceContainer = document.getElementById('choice_container');
    const comCards = document.getElementById('com_cards');
    const bestHand = document.getElementById('best_hand');
    const thisPlayer = players.find(player => player.id == playerId);
    const thisPlayerIndex = players.findIndex(player => player.id == playerId);
    const totalPlayers = players.length;
    const midPoint = Math.floor(totalPlayers / 2);
    const turnPlayer = players.find(player => player.current);
    const playerListIds = Array.from(playerList.children).map(child => child.id);
    const playerIds = players.map(player => player.id);
    const gameLogBox = document.getElementById('game_log_box');

    choiceContainer.innerHTML = '';
    gameButtonContainer.innerHTML = '';
    pot.innerHTML = `Pot: $${game.pot}`;

    for (let i = 0; i < playerListIds.length; i++) {
        if (!playerIds.includes(playerListIds[i])) {
            let playerRemove = document.getElementById(playerListIds[i]);
            playerRemove.remove();
        }
    }

    if (thisPlayer.afk > 2) {
        const gameButton = document.createElement('button');
        gameButton.setAttribute('class', 'common_button green_button');
        gameButton.innerHTML = "Join Game";
        gameButtonContainer.appendChild(gameButton);
        gameButton.addEventListener("click", () => {
            socket.emit('playerAction', { gameId: gameId, playerId: playerId, sessionId: sessionId, action: 'join' });
        });
    } else {
        const gameButton = document.createElement('button');
        gameButton.setAttribute('class', 'common_button red_button');
        gameButton.innerHTML = "Leave Game";
        gameButtonContainer.appendChild(gameButton);
        gameButton.addEventListener("click", () => {
            socket.emit('playerAction', { gameId: gameId, playerId: playerId, sessionId: sessionId, action: 'leave' });
            window.location.href = '/';
        });
    }

    players.forEach((player, index) => {
        let infoContainer = document.getElementById(player.id);

        if (infoContainer == null) {
            infoContainer = makePlayer(player, player.id == playerId);
            playerList.appendChild(infoContainer);
        }

        let indDiff = index - thisPlayerIndex;
        let offset = Math.abs(indDiff) > midPoint ? ((index > midPoint) ? index - players.length : index + 1) : indDiff;
        let playerColumn = 4 + offset
        infoContainer.style.gridColumn = `${playerColumn}`;

        const playerInfoContainer = infoContainer.querySelector('.player_info_container');
        const playerInfo = infoContainer.querySelector('.player_info');
        if (index == thisPlayerIndex) {
            playerInfo.classList.add('self');
        }

        if (game.live) {
            const hand = playerInfo.querySelector('.player_hand');
            const balance = playerInfo.querySelector('.player_balance');
            const cardsInHand = Array.from(hand.children).map(card => card.id);
            let playerScore = infoContainer.querySelector('.player_score');
            let netChange = infoContainer.querySelector('.net_change');
            let delay = 0;

            balance.innerHTML = `$${player.balance}`;

            if (!cardsInHand || gameHand != game.hand || `${cardsInHand}` != `${player.hand}`) {
                hand.innerHTML = '';
                player.hand.forEach(card => {
                    if (card == null) {
                        hand.appendChild(makeCardBack());
                    } else {
                        delay += 300;
                        hand.appendChild(makeCardFlip(card, delay));
                    }
                });
            }

            if (player.current && !game.hand_over) {
                let draw = playerInfoContainer.querySelector('.draw');
                if (draw == null || game.time_left == game.time_per_move) {
                    playerInfo.classList.remove('draw');
                    playerInfoContainer.classList.add('turn');
                    playerInfo.offsetWidth;
                    playerInfo.classList.add('draw');
                    let draw = playerInfoContainer.querySelector('.draw');
                    draw.style.setProperty('--time_left', `${game.time_left}s`)
                    draw.style.animationPlayState = "running";
                }
                if (thisPlayer.id == turnPlayer.id) {
                    playerInfoContainer.classList.add('flash');
                }
            } else {
                playerInfo.classList.remove('draw');
                playerInfoContainer.classList.remove('turn');
                playerInfoContainer.classList.remove('flash');
            }

            if (netChange == null) {
                if ((player.in_pot > 0 && !game.hand_over) || player.profit > 0) {
                    netChange = document.createElement('div');
                    netChange.setAttribute('class', 'value_container net_change');
                    infoContainer.appendChild(netChange);
                }
            } else if (!(player.in_pot > 0 && !game.hand_over || player.profit > 0)) {
                infoContainer.removeChild(netChange);
            }

            if (player.in_pot > 0 && netChange != null) {
                netChange.innerHTML = `-$${player.in_pot}`;
                netChange.style.backgroundColor = 'rgb(255, 0, 0, 0.4)';
            }

            if (player.profit > 0 && netChange != null) {
                netChange.innerHTML = `+$${player.profit}`;
                netChange.style.backgroundColor = 'rgb(0, 100, 0, 0.5)';
            }

            if (game.hand_over && (player.id != playerId || player.show) && player.score[0] > -1 && playerScore == null) {
                let playerScore = document.createElement('div');
                let scoreRow = netChange == null ? 2 : 3;
                playerScore.setAttribute('class', 'player_score');
                playerScore.style.gridRow = `${scoreRow}`;
                playerScore.innerHTML = `${scoreRanking[player.score[0]]}`;
                infoContainer.appendChild(playerScore);
            }

            if (!game.hand_over && playerScore != null) {
                infoContainer.removeChild(playerScore);
            }

            if (!player.live) {
                playerInfo.style.opacity = '0.2';
            } else {
                playerInfo.style.opacity = '1';
            }
        }
    });

    if (!game.live) {
        if (playerId == game.creator_id) {
            if (choiceContainer.childElementCount > 0) {
                return;
            }
            const startButton = document.createElement('button');
            startButton.setAttribute('id', 'start_game_button');
            startButton.setAttribute('class', 'common_button');
            startButton.innerHTML = 'Start Game';
            choiceContainer.appendChild(startButton);
            startButton.addEventListener('click', () => {
                socket.emit('playerAction', { gameId: gameId, playerId: playerId, sessionId: sessionId, action: 'new_hand' });
            });
        }
        return;
    }

    if (gameHand != game.hand) {
        comCards.innerHTML = '';
        gameHand = game.hand;
    }

    let delay = 0;
    game.cards.forEach(card => {
        if (!document.getElementById(card)) {
            delay += 300;
            comCards.appendChild(makeCardFlip(card, delay));
        }
    });

    if (thisPlayer.live) {
        if (choiceContainer.children.length == 0) {
            const mainChoices = document.createElement('div');
            mainChoices.setAttribute('id', 'main_choices');
            choiceContainer.appendChild(mainChoices);
        }

        const mainChoices = choiceContainer.querySelector('#main_choices');

        const callAmount = game.current_bet - thisPlayer.in_pot;
        const minRaise = game.min_raise + callAmount;

        let raiseAmount = minRaise;

        const callButton = document.createElement('button');
        const foldButton = document.createElement('button');
        const raiseButton = document.createElement('button');
        const raiseSlider = document.createElement('input');
        const bestHandScore = bestHand.querySelector('.player_score');
        const bestHandCards = bestHand.querySelector('.best_hand_cards');

        callButton.setAttribute('class', 'common_button blue_button');
        callButton.setAttribute('id', 'call_button');
        foldButton.setAttribute('class', 'common_button red_button');
        foldButton.setAttribute('id', 'fold_button');
        raiseButton.setAttribute('class', 'common_button green_button');
        raiseSlider.setAttribute('type', 'range');
        raiseSlider.setAttribute('max', thisPlayer.balance);
        raiseSlider.setAttribute('min', minRaise);
        raiseSlider.setAttribute('value', minRaise);
        raiseSlider.setAttribute('step', Math.floor(game.big_blind / 2));
        raiseSlider.setAttribute('id', 'raise_slider');

        mainChoices.appendChild(callButton);
        mainChoices.appendChild(foldButton);

        bestHandScore.innerHTML = `${scoreRanking[thisPlayer.score[0]]}`;
        bestHandCards.innerHTML = "";

        for (let i = 0; i < thisPlayer.best_hand.length; i++) {
            bestHandCards.appendChild(makeCardFront(thisPlayer.best_hand[i]));
        }

        if (thisPlayer.next_move != null) {
            if (thisPlayer.next_move == 'check') {
                callButton.classList.add('active');
                foldButton.classList.remove('active');
            } else {
                foldButton.classList.add('active');
                callButton.classList.remove('active');
            }
        } else {
            callButton.classList.remove('active');
            foldButton.classList.remove('active');
        }

        if (!game.hand_over && turnPlayer.next_move != null && playerId == turnPlayer.id) {
            if (turnPlayer.next_move == 'check') {
                socket.emit('playerAction', { gameId: gameId, playerId: playerId, sessionId: sessionId, action: 'check' });
            } else if (turnPlayer.next_move == 'fold') {
                socket.emit('playerAction', { gameId: gameId, playerId: playerId, sessionId: sessionId, action: 'fold' });
            }
        } else if (!game.hand_over) {
            let raiseAction = 'Raise';
            foldButton.innerHTML = 'Fold';

            if (callAmount == 0) {
                callButton.innerHTML = 'Check';
                raiseAction = 'Bet';
            } else if (thisPlayer.balance > callAmount) {
                callButton.innerHTML = `$${callAmount} Call`;
            } else {
                callButton.innerHTML = `$${thisPlayer.balance} All-in`;
            }

            callButton.addEventListener("click", () => {
                choiceContainer.classList.remove('flash');
                socket.emit('playerAction', { gameId: gameId, playerId: playerId, sessionId: sessionId, action: 'check' });
            });

            foldButton.addEventListener("click", () => {
                choiceContainer.classList.remove('flash');
                socket.emit('playerAction', { gameId: gameId, playerId: playerId, sessionId: sessionId, action: 'fold' });
            });

            if (playerId == turnPlayer.id) {
                if (thisPlayer.balance > minRaise) {
                    raiseButton.innerHTML = `$${minRaise} ${raiseAction}`;
                    raiseSlider.oninput = () => {
                        raiseAmount = raiseSlider.value;
                        if (thisPlayer.balance - raiseAmount < game.min_raise) {
                            raiseSlider.setAttribute('step', 1);
                        } else {
                            raiseSlider.setAttribute('step', Math.floor(game.big_blind / 2));
                        }
                        raiseButton.innerHTML = `$${raiseAmount} ${raiseAction}`;
                    }
                    mainChoices.appendChild(raiseButton);
                    choiceContainer.appendChild(raiseSlider);
                } else if (thisPlayer.balance > callAmount) {
                    raiseAmount = thisPlayer.balance;
                    raiseButton.innerHTML = `$${raiseAmount} All-in`;
                    mainChoices.appendChild(raiseButton);
                }

                if (thisPlayer.balance > callAmount) {
                    raiseButton.addEventListener("click", () => {
                        choiceContainer.classList.remove('flash');
                        socket.emit('playerAction', { gameId: gameId, playerId: playerId, sessionId: sessionId, action: 'bet', amount: raiseAmount });
                    });
                }

                choiceContainer.classList.add('flash');
            }
        } else {
            if (!thisPlayer.show) {
                callButton.innerHTML = 'Show';
                foldButton.innerHTML = 'Muck';
                choiceContainer.classList.add('flash');
                callButton.addEventListener("click", () => {
                    choiceContainer.classList.remove('flash');
                    socket.emit('playerAction', { gameId: gameId, playerId: playerId, sessionId: sessionId, action: 'show' });
                });

                foldButton.addEventListener("click", () => {
                    choiceContainer.classList.remove('flash');
                    choiceContainer.innerHTML = '';
                });

            } else {
                choiceContainer.classList.remove('flash');
                choiceContainer.innerHTML = '';
            }
        }
    }

    if (game.hand_over) {
        const newGameDelay = 8000;

        gameHand = game.hand++;
        setTimeout(() => {
            socket.emit('playerAction', { gameId: gameId, playerId: playerId, sessionId: sessionId, action: 'new_hand' });
            if (thisPlayer.afk > 5) {
                window.location.href = '/';
            }
        }, newGameDelay);
    }
});

document.addEventListener('DOMContentLoaded', () => {
    const chatInput = document.getElementById('chat_input');
    const chatBox = document.getElementById('chat_box');
    const gameLogBox = document.getElementById('game_log_box');
    const bestHandButtonContainer = document.getElementById('best_hand_button_container');
    const chatButtonContainer = document.getElementById('chat_button_container');
    const gameLogButtonContainer = document.getElementById('game_log_button_container');
    const bestHandButton = document.getElementById('best_hand_button');
    const chatButton = document.getElementById('chat_button');
    const gameLogButton = document.getElementById('game_log_button');
    const bestHand = document.getElementById('best_hand');
    const chat = document.getElementById('chat');
    const gameLog = document.getElementById('game_log');

    bestHandButtonContainer.style.backgroundColor = 'rgb(0, 0, 0, 0.2)';

    bestHandButton.addEventListener("click", () => {
        bestHand.style.setProperty('--show', 'grid');
        chat.style.setProperty('--show', 'none');
        gameLog.style.setProperty('--show', 'none');
        bestHandButtonContainer.style.backgroundColor = 'rgb(0, 0, 0, 0.2)';
        chatButtonContainer.style.backgroundColor = 'rgb(0, 0, 0, 0)';
        gameLogButtonContainer.style.backgroundColor = 'rgb(0, 0, 0, 0)';
    });

    chatButton.addEventListener("click", () => {
        bestHand.style.setProperty('--show', 'none');
        chat.style.setProperty('--show', 'grid');
        gameLog.style.setProperty('--show', 'none');
        bestHandButtonContainer.style.backgroundColor = 'rgb(0, 0, 0, 0)';
        chatButtonContainer.style.backgroundColor = 'rgb(0, 0, 0, 0.2)';
        gameLogButtonContainer.style.backgroundColor = 'rgb(0, 0, 0, 0)';
    });

    gameLogButton.addEventListener("click", () => {
        bestHand.style.setProperty('--show', 'none');
        chat.style.setProperty('--show', 'none');
        gameLog.style.setProperty('--show', 'grid');
        bestHandButtonContainer.style.backgroundColor = 'rgb(0, 0, 0, 0)';
        chatButtonContainer.style.backgroundColor = 'rgb(0, 0, 0, 0)';
        gameLogButtonContainer.style.backgroundColor = 'rgb(0, 0, 0, 0.2)';
    });

    chatInput.addEventListener('keydown', e => {
        if (e.key === 'Enter') {
            socket.emit('playerChat', { gameId: gameId, playerId: playerId, sessionId: sessionId, input: chatInput.value, new: false });
            chatInput.value = '';
        }
    });

    socket.on('chat', content => {
        let lines = content.lines;
        for (let i = 0; i < lines.length; i++) {
            let line = document.createElement('div');
            line.innerHTML = `<b>${lines[i][0]}:</b> ${lines[i][1]}`;
            chatBox.appendChild(line);
        }
        chatBox.scrollTop = chatBox.scrollHeight;
    });

    socket.on('log', content => {
        let lines = content.lines;
        for (let i = 0; i < lines.length; i++) {
            let line = document.createElement('div');
            line.innerHTML = parseLog(lines[i]);
            gameLogBox.appendChild(line);
        }
        gameLogBox.scrollTop = gameLogBox.scrollHeight;
    });



});