
document.addEventListener('DOMContentLoaded', () => {
    const options = [
        {title: 'Beginner', smallBlind: '1', bigBlind: '2', buyIn: '100'}, 
        {title: 'Casual', smallBlind: '5', bigBlind: '10', buyIn: '500'},
        {title: 'High Stakes', smallBlind: '50', bigBlind: '100', buyIn: '5000'},
        {title: 'Professional', smallBlind: '100', bigBlind: '200', buyIn: '1000'},
        {title: 'Custom'}
    ];

    const gameOptionsDiv = document.querySelector('.game_options');

    options.forEach(option => {
        const button = document.createElement('button');
        const buttonContent = document.createElement('div');
        const buttonTitle = document.createElement('h3');
        buttonContent.setAttribute('class', 'button_content')
        buttonTitle.setAttribute('class', 'button_title'); 


        buttonTitle.innerText = option.title;
        buttonContent.appendChild(buttonTitle);

        if (option.title != 'Custom') {
            const buttonBuyIn = document.createElement('p');
            const buttonSmallBlind = document.createElement('p');
            const buttonBigBlind = document.createElement('p');
            buttonBuyIn.innerText = `Buy-in: $${option.buyIn}`;
            buttonSmallBlind.innerText = `Small Blind: $${option.smallBlind}`;
            buttonBigBlind.innerText = `Big Blind: $${option.bigBlind}`;
            buttonContent.appendChild(buttonBuyIn);
            buttonContent.appendChild(buttonSmallBlind);
            buttonContent.appendChild(buttonBigBlind);
        } else {
            buttonTitle.setAttribute('id', 'custom_button')
        }

        button.appendChild(buttonContent);
        gameOptionsDiv.appendChild(button);
    });
});