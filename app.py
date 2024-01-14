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
    game.add_player(player_name, player_id, game.buy_in)
    game.creator_id = player_id
    response = redirect(url_for('play', game_id=game_id))
    response.set_cookie('player_id', player_id)
    return response

@app.route('/add_player/<game_id>', methods=['POST'])
def add_player(game_id):
    player_id = request.cookies.get('player_id')
    game = games[game_id]
    if player_id in [p.id for p in game.players]:
        return "You have already joined the game."
    player_name = request.form['player_name']
    player_id = secrets.token_hex(16)
    
    game.add_player(player_name, player_id, game.buy_in)
    response = redirect(url_for('play', game_id=game_id))
    response.set_cookie('player_id', player_id)
    return response

@socketio.on('join')
def on_join(data):
    game_id = data['gameId']
    player_id = data['playerId']
    join_room(game_id)
    join_room(player_id)
    
@socketio.on('getPlayers')
def get_player(data):
    game_id = data['gameId']
    game = games[game_id]
    players_json = json.dumps([{'name': p.name, 'id': p.id, 'balance': p.balance, 'creator': p.id == game.creator_id} for p in game.players])
    socketio.emit('player_list', players_json, room=game_id)

@socketio.on('handStart')
def start_game(data):
    game_id = data['gameId']
    game = games[game_id]
    game.new_hand()
    game.live = True

@socketio.on('getPlayerHand')
def get_player_hand(data):
    game_id = data['gameId']
    player_id = data['playerId']
    game = games[game_id]
    player = next(p for p in game.players if p.id == player_id)
    socketio.emit('player_hand', {'cards': player.hand, 'score': player.score}, room=player_id)

@socketio.on('playerAction')
def handle_player_action(data):
    action = data['action']
    game_id = data['gameId']
    player_id = data['playerId']
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

    players_json = json.dumps([{'name': p.name, 'id': p.id, 'balance': p.balance, 'live': p.live, 'in_pot': p.bets[game.round], 'current': p == game.cur_player() and game.live} for p in game.players])
    max_score = max([p.score for p in game.players if p.live])
    winners = [p for p in game.players if p.live and p.score == max_score]
    socketio.emit('player_list', players_json, room=game_id)
    socketio.emit('game_info', {'live': game.live, 'pot': game.pot, 'cards': game.community_cards, 'current_bet': game.current_bet, 'creator_id': game.creator_id, 'min_bet': game.min_bet}, room=game_id)

if __name__ == '__main__':
    socketio.run(app, debug=True)