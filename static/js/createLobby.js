document.addEventListener('DOMContentLoaded', () => {
    const params = new URLSearchParams(window.location.search);
    const lobbyForm = document.getElementById('lobby_form');

    const playerNameField = document.getElementById('player_name_field');
    const lobbyPassField = document.getElementById('lobby_pass_field');
    const buyInField = document.getElementById('buy_in_field');
    const smallBlindField = document.getElementById('small_blind_field');
    const bigBlindField = document.getElementById('big_blind_field');

    const buyInInput = document.getElementById('buy_in');
    const smallBlindInput = document.getElementById('small_blind');
    const bigBlindInput = document.getElementById('big_blind');

    let buyIn = params.get('buyIn');
    let smallBlind = params.get('smallBlind');
    let bigBlind = params.get('bigBlind');

    if (buyIn != "undefined" & buyIn != null) {
        let buyInLabel = buyInField.querySelector('label');
        buyInLabel.innerHTML = '';
        buyInInput.type = 'hidden';
        buyInInput.value = buyIn;
    }
    if (smallBlind != "undefined" & smallBlind != null) {
        let smallBlindLabel = smallBlindField.querySelector('label');
        smallBlindLabel.innerHTML = '';
        smallBlindInput.type = 'hidden';
        smallBlindInput.value = smallBlind;
    }
    if (bigBlind != "undefined" & bigBlind != null) {
        let bigBlindLabel = bigBlindField.querySelector('label');
        bigBlindLabel.innerHTML = '';
        bigBlindInput.type = 'hidden';
        bigBlindInput.value = smallBlind;
    }

    lobbyForm.addEventListener('submit', event => {
        const playerNameErr = playerNameField.querySelector('.error');
        const lobbyPassErr = lobbyPassField.querySelector('.error');
        const buyInErr = buyInField.querySelector('.error');
        const smallBlindErr = smallBlindField.querySelector('.error');
        const bigBlindErr = bigBlindField.querySelector('.error');
        const errors = [playerNameErr, lobbyPassErr, buyInErr, smallBlindErr, bigBlindErr];

        let playerName = document.getElementById('player_name').value;
        let lobbyPass = document.getElementById('lobby_pass').value;
        let buyIn = document.getElementById('buy_in').value;
        let smallBlind = document.getElementById('small_blind').value;
        let bigBlind = document.getElementById('big_blind').value;
        let errFound = false;

        buyIn = parseInt(buyIn);
        smallBlind = parseInt(smallBlind);
        bigBlind = parseInt(bigBlind);

        console.log(buyIn);

        errors.forEach(err => {
            err.innerHTML = '';
            err.classList.remove('found');
        });

        if (playerName.length > 20) {
            playerNameErr.classList.add('found');
            playerNameErr.innerHTML = "Name length can not exceed 20 characters.";
            errFound = true;
        }

        if (lobbyPass.length > 128) {
            lobbyPassErr.classList.add('found');
            lobbyPassErr.innerHTML = "Password length can not exceed 128 characters.";
            errFound = true;
        }

        if (buyIn < 1 || isNaN(buyIn) || buyIn == null || buyIn == undefined) {
            buyInErr.classList.add('found');
            buyInErr.innerHTML = "Buy In must be greater than 0.";
            errFound = true;
        }

        if (smallBlind > bigBlind) {
            smallBlindErr.classList.add('found');
            smallBlindErr.innerHTML = "Small Blind must be less than or equal to Big Blind.";
            errFound = true;
        }

        if (bigBlind > buyIn) {
            bigBlindErr.classList.add('found');
            bigBlindErr.innerHTML = "Big Blind must be less than or equal to Buy In.";
            errFound = true;
        }

        if (errFound === true) {
            event.preventDefault();
        }
    });
});