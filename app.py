from flask import Flask, request, render_template, redirect, request, url_for
import secrets, uuid, json
from texas_holdem import *

app = Flask(__name__)
app.config['SECRET_KEY'] = secrets.token_hex(32)
games = {}

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/create_game', methods=['POST'])
def create_game():
    game_id = str(uuid.uuid4())
    games[game_id] = TexasHoldem()
    starting_balance = request.form['starting_balance']
    player_name = request.form['player_name']
    player_id = secrets.token_hex(16)
    player = Player(player_name, player_id, starting_balance)
    games[game_id].players.append(player)
    games[game_id].creator_id = player_id
    response = redirect(url_for('lobby', game_id=game_id))
    response.set_cookie('player_id', player_id)
    return response

@app.route('/add_player/<game_id>', methods=['POST'])
def add_player(game_id):
    player_name = request.form['player_name']
    starting_balance = request.form['starting_balance']
    if request.cookies.get('player_id'):
        return "You have already joined the game."
    player_id = secrets.token_hex(16)
    player = Player(player_name, player_id, starting_balance)
    games[game_id].players.append(player)
    response = redirect(url_for('lobby', game_id=game_id))
    response.set_cookie('player_id', player_id)
    return response

@app.route('/lobby/<game_id>')
def lobby(game_id):
    join_url = request.host_url + '/join/' + game_id
    return render_template('lobby.html', join_url=join_url, creator_id=games[game_id].creator_id)

@app.route('/players/<game_id>')
def players(game_id):
    # Get the player data for the specified game ID
    players = [{'name': player.name, 'balance': player.balance} for player in games[game_id].players]

    # Return the player data as JSON
    return json.dumps(players)

@app.route('/join/<game_id>')
def player(game_id):
    return render_template('player.html', game_id=game_id)
