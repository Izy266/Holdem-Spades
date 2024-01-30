document.addEventListener('DOMContentLoaded', () => {
    const options = [
        { title: 'Beginner', smallBlind: '1', bigBlind: '2', buyIn: '100' },
        { title: 'Casual', smallBlind: '5', bigBlind: '10', buyIn: '500' },
        { title: 'High Stakes', smallBlind: '50', bigBlind: '100', buyIn: '5000' },
        { title: 'Professional', smallBlind: '100', bigBlind: '200', buyIn: '10000' },
        { title: 'Custom' }
    ];

    const gameOptionsDiv = document.querySelector('.game_options');

    options.forEach(option => {
        const button = document.createElement('button');
        const buttonContent = document.createElement('div');
        const buttonTitle = document.createElement('h3');
        button.setAttribute('class', 'game_options_button')
        button.setAttribute('id', option.title)
        buttonContent.setAttribute('class', 'button_content')
        buttonTitle.setAttribute('class', 'button_title');


        buttonTitle.innerText = option.title;
        buttonContent.appendChild(buttonTitle);

        if (option.title != 'Custom') {
            const optionInfo = document.createElement('div');
            const buttonBuyIn = document.createElement('p');
            const buttonSmallBlind = document.createElement('p');
            const buttonBigBlind = document.createElement('p');
            optionInfo.setAttribute('class', 'optionInfo');
            buttonBuyIn.innerText = `Buy-in: $${option.buyIn}`;
            buttonSmallBlind.innerText = `Small Blind: $${option.smallBlind}`;
            buttonBigBlind.innerText = `Big Blind: $${option.bigBlind}`;
            optionInfo.appendChild(buttonBuyIn);
            optionInfo.appendChild(buttonSmallBlind);
            optionInfo.appendChild(buttonBigBlind);
            buttonContent.appendChild(optionInfo);
        } else {
            buttonTitle.setAttribute('id', 'custom_button')
        }

        button.appendChild(buttonContent);
        gameOptionsDiv.appendChild(button);
        button.addEventListener('click', () => {
            window.location.href = `/create_lobby?buyIn=${option.buyIn}&smallBlind=${option.smallBlind}&bigBlind=${option.bigBlind}`;
        });
    });
});