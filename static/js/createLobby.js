document.addEventListener('DOMContentLoaded', () => {
    const params = new URLSearchParams(window.location.search);
    const form = document.getElementById('lobby_form');

    let buyInField = document.getElementById('starting_balance_field');
    let smallBlindField = document.getElementById('small_blind_field');
    let bigBlindField = document.getElementById('big_blind_field');

    const buyIn = params.get('buyIn');
    const smallBlind = params.get('smallBlind');
    const bigBlind = params.get('bigBlind');

    console.log(buyIn, smallBlind, bigBlind);

    if (buyIn != "undefined" & buyIn != null) {
        form.removeChild(buyInField);
        buyInField = document.createElement('input');
        buyInField.type = 'hidden';
        buyInField.name = 'starting_balance';
        buyInField.value = buyIn;
        form.appendChild(buyInField);
    }
    if (smallBlind != "undefined" & buyIn != null) {
        form.removeChild(smallBlindField);
        smallBlindField = document.createElement('input');
        smallBlindField.type = 'hidden';
        smallBlindField.name = 'small_blind';
        smallBlindField.value = smallBlind;
        form.appendChild(smallBlindField);
    }
    if (bigBlind != "undefined" & buyIn != null) {
        form.removeChild(bigBlindField);
        bigBlindField = document.createElement('input');
        bigBlindField.type = 'hidden';
        bigBlindField.name = 'big_blind';
        bigBlindField.value = bigBlind;
        form.appendChild(bigBlindField);
    }
});