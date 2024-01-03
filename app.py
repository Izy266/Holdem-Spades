from flask import Flask, request, render_template, redirect
from flask_socketio import SocketIO, emit
from utils import *

app = Flask(__name__)
app.config['SECRET_KEY'] = 'secret!'
socketio = SocketIO(app)

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
    game_id = generate_game_id() # Replace this with your own function to generate a unique game ID
    socketio.emit('create_game', {'game_id': game_id})
    return redirect('/game/' + game_id)

@app.route('/game/<game_id>')
def game(game_id):
    return render_template('game.html', game_id=game_id)

if __name__ == '__main__':
    socketio.run(app)