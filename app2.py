from flask import Flask, request, render_template, redirect, url_for
from flask_socketio import SocketIO, join_room
from holdem import *
import secrets, uuid, json, time, threading, bleach

def clean(text):
    return bleach.clean(text, tags={})

def run_timer(game):
    while not game.hand_over():
        time_now = time.time()
        time_elapsed = time_now - game.move_time_start
        game.move_time_remaining = game.time_per_move - time_elapsed
        cur_player = game.cur_player()
        if time_elapsed > game.time_per_move:
            game.move_time_start = time_now
            cur_player.afk += 1
            handle_player_action({'gameId': game.id, 'playerId': cur_player.id, 'sessionId': cur_player.session_id, 'action': 'afk_fold'})
        time.sleep(0.1)

def set_timer(game):
    game.move_time_start = time.time()
    game.move_time_remaining = game.time_per_move

    if game.timer_thread is None or not game.timer_thread.is_alive():
        game.timer_thread = threading.Thread(target=run_timer, args=(game,))
        game.timer_thread.start()

app = Flask(__name__)
app.config['SECRET_KEY'] = secrets.token_hex(32)
socketio = SocketIO(app)
games = {} # implement database instead of dict

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
    return render_template('game.html')

@app.route('/create_game', methods=['POST'])
def create_game():
    game_id = str(uuid.uuid4())
    player_id = secrets.token_hex(16)
    game = TexasHoldem(game_id, player_id, int(request.form['buy_in']), int(request.form['small_blind']), int(request.form['big_blind']))
    player_name = clean(str(request.form['player_name']))
    games[game_id] = game
    
    session_id = secrets.token_hex(16)
    player = Player(player_name, player_id, game.buy_in)
    player.session_id = session_id
    game.add_player(player)
    game.creator_id = player_id
    game.id = game_id
    response = redirect(url_for('play', game_id=game_id))
    response.set_cookie('player_id', player_id)
    response.set_cookie('session_id', session_id)
    return response

@app.route('/add_player/<game_id>', methods=['POST'])
def add_player(game_id):
    player_id = request.cookies.get('player_id')
    game = games[game_id]

    player_name = clean(str(request.form['player_name']))
    player_id = secrets.token_hex(16)
    session_id = secrets.token_hex(16)
    player = Player(player_name, player_id, game.buy_in)
    player.session_id = session_id
    player.live = not game.live
    game.add_player(player)
    response = redirect(url_for('play', game_id=game_id))
    response.set_cookie('player_id', player_id)
    response.set_cookie('session_id', session_id)
    return response

@socketio.on('join')
def on_join(data):
    game_id = clean(str(data['gameId']))
    player_id = clean(str(data['playerId']))
    session_id = clean(str(data['sessionId']))
    game = games[game_id]
    player_sessions = {p.id: p.session_id for p in game.players}

    if player_id not in player_sessions or player_sessions[player_id] != session_id:
        return {"error": "Player not in game.", "gameId": game_id}
    if player_sessions[player_id] != session_id:
        return {"error": "Invalid session for player.", "gameId": game_id}
    
    this_player = next(p for p in game.players if p.id == player_id)
    this_player.in_game = True

    join_room(game_id)
    join_room(player_id)

@socketio.on('playerAction')
def handle_player_action(data):
    action = clean(str(data['action']))
    game_id = clean(str(data['gameId']))
    player_id = clean(str(data['playerId']))
    session_id = clean(str(data['sessionId']))
    game = games[game_id]
    player_sessions = {p.id: p.session_id for p in game.players}
    actions = ['none', 'join', 'leave', 'check', 'bet', 'fold', 'afk_fold', 'new_hand', 'show']
    if player_id not in player_sessions or session_id != player_sessions[player_id] or action not in actions:
        return
    
    cur_player = game.current_player()
    this_player = game.get_player_by_id(player_id)
    available_players = [p for p in game.players if p.balance and p.afk < 3]

    if action in ['check', 'bet', 'fold', 'afk_fold']:
        if player_id == cur_player.id:
            set_timer(game)
            this_player.next_move = None
            if action == 'check':
                game.check()
            elif action == 'bet':
                amount = data.get('amount')
                game.bet(int(amount))
            elif action in ['fold', 'afk_fold']:
                game.fold()
        elif action in ['check', 'fold']:
            this_player.next_move = None if this_player.next_move == action else action
    
    elif action == 'new_hand':
        if len(available_players) > 1 and (game.hand_over() or player_id == game.creator_id):
            game.new_hand()
            set_timer(game)
    
    elif action == 'leave':
        this_player.in_game = False
        this_player.live = False
    
    elif action == 'join':
        this_player.afk = 0
    
    elif action == 'show':
        this_player.show = game.hand_over()
    
    for player in game.players:
        if player.in_game:
            players_json = json.dumps([{'name': p.name, 'id': p.id, 'balance': p.balance, 'in_game': p.in_game, 'live': p.live, 'in_pot': p.bets[game.round] if game.round < len(p.bets) else 0, 'current': p == game.cur_player(), 'next_move': p.next_move if p.id == player.id else None, 'hand': p.hand if (p.show or p.id == player.id) else [None, None] if p.hand else [], 'best_hand': p.best_hand if p.id == player.id else [], 'score': p.score if (p.show or p.id == player.id) else [-1], 'profit': p.profit, 'show': p.show, 'afk': p.afk} for p in game.players])
            socketio.emit('player_list', players_json, room=player.id)
    socketio.emit('game_info', {'live': game.live, 'pot': game.pot, 'cards': game.community_cards, 'current_bet': game.current_bet, 'creator_id': game.creator_id, 'min_raise': game.min_raise, 'big_blind': game.big_blind, 'hand': game.hand, 'hand_over': game.hand_over(), 'time_per_move': game.time_per_move, 'time_left': game.move_time_remaining}, room=game_id)

@socketio.on('playerChat')
def handle_chat(data):
    new = bool(data['new'])
    input = clean(str(data['input']))
    game_id = clean(str(data['gameId']))
    player_id = clean(str(data['playerId']))
    session_id = clean(str(data['sessionId']))
    game = games[game_id]
    player_sessions = {p.id: p.session_id for p in game.players}
    player_names = {p.id: p.name for p in game.players}

    if player_id not in player_sessions or session_id != player_sessions[player_id]:
        return
    
    if not new:
        game.chat.append((player_names[player_id], input))
        socketio.emit('chat', {'lines': game.chat[-1:]}, room=game_id)
    else:
        socketio.emit('chat', {'lines': game.chat}, room=player_id)

if __name__ == '__main__':
    socketio.run(app, debug=True)