from flask import Flask, request, render_template, redirect, url_for
from flask_socketio import SocketIO, join_room
import secrets, uuid, json
from holdem import *

# implement database instead of dict

app = Flask(__name__)
app.config['SECRET_KEY'] = secrets.token_hex(32)
socketio = SocketIO(app)
games = {}

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/create_lobby')
def create_lobby():
    return render_template('create_lobby.html')

@app.route('/join/<game_id>')
def join(game_id):
    return render_template('player.html', game_id=game_id)

@app.route('/play/<game_id>')
def play(game_id):
    socketio.emit('game_created', room=game_id)
    game=games[game_id]

    return render_template('game.html')

@app.route('/create_game', methods=['POST'])
def create_game():
    player_name = request.form['player_name']
    game = TexasHoldem(int(request.form['buy_in']), int(request.form['small_blind']), int(request.form['big_blind']))
    game_id = str(uuid.uuid4())
    games[game_id] = game
    player_id = secrets.token_hex(16)
    session_id = secrets.token_hex(16)
    player = Player(player_name, player_id, game.buy_in)
    player.session_id = session_id
    game.add_player(player)
    game.creator_id = player_id
    response = redirect(url_for('play', game_id=game_id))
    response.set_cookie('player_id', player_id, secure=True)
    response.set_cookie('session_id', session_id, secure=True)
    return response

@app.route('/add_player/<game_id>', methods=['POST'])
def add_player(game_id):
    player_id = request.cookies.get('player_id')
    game = games[game_id]

    player_name = request.form['player_name']
    player_id = secrets.token_hex(16)
    session_id = secrets.token_hex(16)
    player = Player(player_name, player_id, game.buy_in)
    player.session_id = session_id
    game.add_player(player)
    response = redirect(url_for('play', game_id=game_id))
    response.set_cookie('player_id', player_id, secure=True)
    response.set_cookie('session_id', session_id, secure=True)
    return response

@socketio.on('join')
def on_join(data):
    game_id = data['gameId']
    player_id = data['playerId']
    session_id = data['sessionId']
    game = games[game_id]
    player_sessions = {p.id: p.session_id for p in game.players}

    if player_id not in player_sessions:
        return {"error": "Player not in game.", "gameId": game_id}
    if player_sessions[player_id] != session_id:
        return {"error": "Invalid session for player.", "gameId": game_id}

    join_room(game_id)
    join_room(player_id)

@socketio.on('handStart')
def start_game(data):
    game_id = data['gameId']
    player_id = data['playerId']
    session_id = data['sessionId']
    game = games[game_id]
    player_sessions = {p.id: p.session_id for p in game.players}

    if game.creator_id == player_id and player_sessions[player_id] == session_id and game.round < 0:
        game.new_hand()
        game.live = True
    elif game.hand_over():
        game.new_hand()

@socketio.on('playerAction')
def handle_player_action(data):
    action = data['action']
    game_id = data['gameId']
    player_id = data['playerId']
    session_id = data['sessionId']
    game = games[game_id]
    cur_player = game.cur_player()
    
    if player_id == cur_player.id:
        if action == 'check':
            game.bet()
        elif action == 'bet':
            amount = data.get('amount')
            game.bet(int(amount))
        elif action == 'fold':
            game.fold()

    round_over = game.round_over()
    if round_over:
        game.handle_round_over()

    hand_over = game.hand_over()
    balances = {p.id: p.balance for p in game.players}

    if hand_over:
        game.distribute_pot()
        for player in game.players:
            player.live = True
        if action == 'show':
            for player in game.players:
                if player.id == player_id:
                    player.show = True
        
    for player in game.players:
        if player.balance - balances[player.id] > 0:
            player.show = True

    for player in game.players:
        players_json = json.dumps([{'name': p.name, 'id': p.id, 'balance': p.balance, 'live': p.live, 'in_pot': p.bets[game.round] if game.round < len(p.bets) else 0, 'current': p == game.cur_player(), 'hand': p.hand if (p.show or p.id == player.id) else [None, None], 'best_hand': p.best_hand if p.id == player.id else [], 'score': p.score if (p.show or p.id == player.id) else [-1], 'profit': p.balance - balances[p.id]} for p in game.players])
        socketio.emit('player_list', players_json, room=player.id)

    socketio.emit('game_info', {'live': game.live, 'pot': game.pot, 'cards': game.community_cards, 'current_bet': game.current_bet, 'creator_id': game.creator_id, 'min_raise': game.big_blind, 'hand_over': hand_over}, room=game_id)

if __name__ == '__main__':
    socketio.run(app, debug=True)