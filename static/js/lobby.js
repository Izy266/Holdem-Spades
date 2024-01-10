document.addEventListener('DOMContentLoaded', () => {
    const playerList = document.querySelector('.player-list');
    const gameId = window.location.pathname.split('/').pop();
    const socket = io();

    socket.emit('playerAction', { gameId: gameId, action: 'lobby' })

    socket.on('player_list', playersJson => {
        playerList.innerHTML = ''
        const players = JSON.parse(playersJson);
        players.forEach(player => {
            playerList.innerHTML += `<h2>${player.name}</h2><p>$${player.balance}</p>`;
        });
    });

    socket.on('game_created', () => {
        window.location.href = '/play/' + gameId;
    });
});