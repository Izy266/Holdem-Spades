from flask import Flask, request, render_template, redirect, request, url_for, session
import secrets
import uuid
from texas_holdem import *

app = Flask(__name__)
app.config['SECRET_KEY'] = secrets.token_hex(32)

holdem = TexasHoldem()

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/create_game', methods=['POST'])
def create_game():
    game_id = str(uuid.uuid4())
    player_name = request.form['player_name']
    player_id = request.cookies.get('player_id')
    starting_balance = request.form['starting_balance']
    player = Player(player_name, player_id, starting_balance)
    holdem.players.append(player)
    holdem.game_id = game_id
    holdem.creator_id = player_id
    response = redirect(url_for('lobby', game_id=game_id))
    response.set_cookie('player_id', secrets.token_hex(16))
    return response

@app.route('/add_player', methods=['POST'])
def add_player():
    player_name = request.form['player_name']
    starting_balance = request.form['starting_balance']
    player_id = request.cookies.get('player_id')
    if player_id:
        return "You have already joined the game."
    player = Player(player_name, starting_balance, player_id)
    holdem.players.append(player)
    response = redirect(url_for('lobby', game_id=holdem.game_id))
    response.set_cookie('player_id', secrets.token_hex(16))
    return response

@app.route('/lobby/<game_id>')
def lobby(game_id):
    players = holdem.players
    join_url = request.host_url + game_id + '/join'
    return render_template('lobby.html', join_url=join_url, creator_id=holdem.creator_id, players=players)

@app.route('/<game_id>/join')
def player(game_id):
    return render_template('player.html', game_id=game_id)
