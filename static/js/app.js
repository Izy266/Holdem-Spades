document.addEventListener('DOMContentLoaded', () => {
    const playerList = document.querySelector('.player-list');
    const gameId = window.location.pathname.split('/').pop();

    function updatePlayerList() {
        fetch(`/players/${gameId}`)
            .then(response => response.json())
            .then(players => {
                let html = '';

                players.forEach(player => {
                    html += `<div><h2>${player.name}</h2><p>$${player.balance}</p></div>`;
                });

                playerList.innerHTML = html;
            });
    }

    updatePlayerList();
    setInterval(() => {
        updatePlayerList();
    }, 1000);
});