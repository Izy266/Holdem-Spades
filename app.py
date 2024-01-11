from flask import Flask, request, render_template, redirect, url_for
from flask_socketio import SocketIO, join_room
import secrets, uuid, json
from holdem import *

# database instead of dict

app = Flask(__name__)
app.config['SECRET_KEY'] = secrets.token_hex(32)
socketio = SocketIO(app)
games = {}

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/lobby/<game_id>')
def lobby(game_id):
    join_url = request.host_url + '/join/' + game_id
    game = games[game_id]
    return render_template('lobby.html', join_url=join_url, game=game, game_id=game_id)

@app.route('/join/<game_id>')
def join(game_id):
    return render_template('player.html', game_id=game_id)

@app.route('/play/<game_id>')
def play(game_id):
    socketio.emit('game_created', room=game_id)
    game=games[game_id]
    if not game.live:
        game.new_hand()
        game.live = True
    return render_template('game.html')

@app.route('/create_game', methods=['POST'])
def create_game():
    game = TexasHoldem()
    game_id = str(uuid.uuid4())
    games[game_id] = game
    starting_balance = int(request.form['starting_balance'])
    player_name = request.form['player_name']
    game.small_blind = request.form['small_blind']
    game.big_blind = request.form['big_blind']
    player_id = secrets.token_hex(16)
    game.add_player(player_name, player_id, starting_balance)
    game.creator_id = player_id
    response = redirect(url_for('lobby', game_id=game_id))
    response.set_cookie('player_id', player_id)
    return response

@app.route('/add_player/<game_id>', methods=['POST'])
def add_player(game_id):
    if request.cookies.get('player_id'):
        return "You have already joined the game."
    player_name = request.form['player_name']
    starting_balance = int(request.form['starting_balance'])
    player_id = secrets.token_hex(16)
    game = games[game_id]
    game.add_player(player_name, player_id, starting_balance)
    response = redirect(url_for('lobby', game_id=game_id))
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
    players_json = json.dumps([{'name': p.name, 'id': p.id, 'balance': p.balance} for p in game.players])
    socketio.emit('player_list', players_json, room=game_id)

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

    players_json = json.dumps([{'name': p.name, 'id': p.id, 'balance': p.balance} for p in game.players])
    max_score = max([p.score for p in game.players if p.live])
    winners = [p for p in game.players if p.live and p.score == max_score]
    socketio.emit('player_list', players_json, room=game_id)
    socketio.emit('game_info', {'cur_player_id': game.cur_player().id, 'cur_bet': game.current_bet, 'pot': game.pot, 'cards': game.community_cards}, room=game_id)

if __name__ == '__main__':
    socketio.run(app)
