from flask import Flask, request, render_template, redirect, request
from flask_socketio import SocketIO, emit
from texas_holdem import *
from utils import *

app = Flask(__name__)
app.config['SECRET_KEY'] = 'secret!'
socketio = SocketIO(app)
holdem = TexasHoldem()

@app.route('/')
def index():
    return render_template('index.html')

@socketio.on('connect')
def test_connect():
    print('Client connected')

@socketio.on('disconnect')
def test_disconnect():
    print('Client disconnected')

@socketio.on('create_game')
def create_game(data):
    game_id = data['game_id']
    emit('game_created', {'game_id': game_id}, broadcast=True)

@app.route('/create_game', methods=['POST'])
def handle_create_game():
    game_id = generate_game_id() 
    socketio.emit('create_game', {'game_id': game_id})
    player_name = request.form['player_name']
    starting_balance = request.form['starting_balance']
    holdem.add_player(player_name, starting_balance)
    return '/game/' + game_id + '/join'

@app.route('/add_player', methods=['POST'])
def handle_add_player():
    player_name = request.form['player_name']
    starting_balance = request.form['starting_balance']
    holdem.add_player(player_name, starting_balance)
    players = holdem.players
    return render_template('game.html', players=players)

@app.route('/game/<game_id>/join')
def player(game_id):
    return render_template('player.html', game_id=game_id)

if __name__ == '__main__':
    socketio.run(app)