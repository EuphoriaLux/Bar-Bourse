# app.py
import sqlite3
from flask import Flask, render_template, jsonify, request, g
from apscheduler.schedulers.background import BackgroundScheduler
import atexit

DATABASE = 'drinks.db'
PRICE_INCREASE_ON_ORDER = 0.50
PRICE_DECREASE_INTERVAL_MINUTES = 2
PRICE_DECREASE_AMOUNT = 0.10

app = Flask(__name__)

def get_db():
    db = getattr(g, '_database', None)
    if db is None:
        db = g._database = sqlite3.connect(DATABASE)
        db.row_factory = sqlite3.Row
    return db

@app.teardown_appcontext
def close_connection(exception):
    db = getattr(g, '_database', None)
    if db is not None:
        db.close()

def decrease_prices():
    with app.app_context():
        db = get_db()
        cursor = db.cursor()
        print("Running scheduled price decrease...")
        
        cursor.execute("SELECT id, current_price, min_price FROM products")
        products = cursor.fetchall()
        
        # This is the value that will be stored for the change
        change_value = -PRICE_DECREASE_AMOUNT

        for product in products:
            new_price = product['current_price'] + change_value
            if new_price < product['min_price']:
                new_price = product['min_price']
            
            # Update price and the last_change value
            cursor.execute("UPDATE products SET current_price = ?, last_change = ? WHERE id = ?", 
                           (round(new_price, 2), round(change_value, 2), product['id']))
        
        db.commit()
        print(f"Prices decreased. Change set to {change_value}.")

@app.route('/api/prices')
def get_prices():
    db = get_db()
    cursor = db.cursor()
    cursor.execute("SELECT id, name, category, highlight_color, current_price, base_price, last_change FROM products")
    products = cursor.fetchall()
    return jsonify([dict(p) for p in products])

@app.route('/api/order', methods=['POST'])
def record_order():
    data = request.get_json()
    product_id = data.get('product_id')
    if not product_id:
        return jsonify({'error': 'Product ID is required'}), 400

    db = get_db()
    cursor = db.cursor()
    cursor.execute("SELECT current_price, max_price FROM products WHERE id = ?", (product_id,))
    product = cursor.fetchone()
    if not product:
        return jsonify({'error': 'Product not found'}), 404

    new_price = product['current_price'] + PRICE_INCREASE_ON_ORDER
    if new_price > product['max_price']:
        new_price = product['max_price']

    # Update price and the last_change value
    cursor.execute("UPDATE products SET current_price = ?, last_change = ? WHERE id = ?", 
                   (round(new_price, 2), round(PRICE_INCREASE_ON_ORDER, 2), product_id))
    
    # Track order count for popular drinks
    cursor.execute("""
        INSERT INTO order_history (product_id, timestamp) 
        VALUES (?, datetime('now'))
    """, (product_id,))
    
    db.commit()
    
    return jsonify({'success': True, 'new_price': round(new_price, 2)})

@app.route('/api/popular')
def get_popular_drinks():
    db = get_db()
    cursor = db.cursor()
    
    # Get drinks ordered in the last hour with count
    cursor.execute("""
        SELECT product_id, COUNT(*) as order_count
        FROM order_history
        WHERE timestamp > datetime('now', '-1 hour')
        GROUP BY product_id
    """)
    
    popular = {row['product_id']: row['order_count'] for row in cursor.fetchall()}
    return jsonify(popular)

@app.route('/')
def index():
    return render_template("index.html")

scheduler = BackgroundScheduler()
scheduler.add_job(func=decrease_prices, trigger="interval", minutes=PRICE_DECREASE_INTERVAL_MINUTES)
scheduler.start()
atexit.register(lambda: scheduler.shutdown())

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)
