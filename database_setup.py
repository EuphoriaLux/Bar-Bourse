# database_setup.py
import sqlite3
import os

DATABASE_FILE = 'drinks.db'

# New data structure: (Name, Category, Highlight Color, Base Price, Min Price, Max Price)
# Highlight Color can be 'yellow', 'purple', 'blue', or None
SAMPLE_DRINKS = [
    # Alcool 4cl
    ('Pastis 51', 'Alcool 4cl', None, 5.10, 4.00, 8.00),
    ('Martini', 'Alcool 4cl', 'blue', 8.60, 6.50, 12.00),
    ('Vodka', 'Alcool 4cl', 'yellow', 6.70, 5.00, 10.00),
    ('Gin / Tequila', 'Alcool 4cl', None, 7.80, 6.00, 11.50),
    ('Havana 3 ans', 'Alcool 4cl', 'purple', 10.30, 8.00, 15.00),
    ('Get 27', 'Alcool 4cl', None, 5.00, 4.00, 7.50),
    ('Captain Morgan', 'Alcool 4cl', 'yellow', 9.40, 7.00, 14.00),
    ('Whisky', 'Alcool 4cl', None, 4.80, 4.00, 8.00),
    # Supérieur 4cl
    ('Hendricks', 'Supérieur 4cl', None, 10.30, 8.50, 16.00),
    ('Nikka', 'Supérieur 4cl', None, 8.90, 7.00, 13.00),
    ('Grey Goose', 'Supérieur 4cl', None, 10.50, 8.50, 16.50),
    ('Diplomatico', 'Supérieur 4cl', 'purple', 14.20, 11.00, 20.00),
    ('Jack Daniels', 'Supérieur 4cl', None, 7.30, 6.00, 11.00),
    # Bière 50cl
    ('Leffe', 'Bière 50cl', None, 7.90, 6.00, 11.00),
    ('Hoegaarden', 'Bière 50cl', None, 7.60, 6.00, 10.50),
    ('Leffe Ruby', 'Bière 50cl', 'purple', 10.80, 8.00, 15.00),
    ('Gir. de Stella', 'Bière 50cl', None, 34.00, 28.00, 45.00),
    # Vin 12cl
    ('Rge Côte du Rh.', 'Vin 12cl', None, 4.50, 3.50, 7.00),
    ('Chardonnay', 'Vin 12cl', 'yellow', 4.50, 3.50, 7.00),
    ('Rosé', 'Vin 12cl', None, 6.90, 5.00, 9.50),
    # Bière Bouteille
    ('Delirium', 'Bière Bouteille', 'yellow', 10.60, 8.00, 15.00),
    ('Guiness', 'Bière Bouteille', None, 8.20, 6.50, 12.00),
    ('Cubanisto', 'Bière Bouteille', None, 6.00, 4.50, 9.00),
    # Shooter 3cl
    ('Jager Bomb', 'Shooter 3cl', None, 8.50, 6.00, 12.00),
    ('VodkAromatisé', 'Shooter 3cl', None, 3.90, 3.00, 6.00),
    ('Neymar', 'Shooter 3cl', 'purple', 5.30, 4.00, 8.00),
    # Sans Alcool 33cl
    ('Soft', 'Sans Alcool 33cl', None, 5.20, 4.00, 7.00),
    ('Red Bull 25cl', 'Sans Alcool 33cl', None, 4.10, 3.50, 6.00),
]

def setup_database():
    conn = sqlite3.connect(DATABASE_FILE)
    cursor = conn.cursor()

    # Check if the tables already exist
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='products'")
    products_table_exists = cursor.fetchone() is not None
    
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='order_history'")
    order_history_table_exists = cursor.fetchone() is not None

    cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='price_history'")
    price_history_table_exists = cursor.fetchone() is not None

    if products_table_exists and order_history_table_exists and price_history_table_exists:
        print("Database tables already exist. Skipping creation.")
        conn.close()
        return

    cursor.execute('''
    CREATE TABLE products (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL UNIQUE,
        category TEXT NOT NULL,
        highlight_color TEXT,
        base_price REAL NOT NULL,
        current_price REAL NOT NULL,
        min_price REAL NOT NULL,
        max_price REAL NOT NULL,
        last_change REAL NOT NULL DEFAULT 0
    )
    ''')
    
    cursor.execute('''
    CREATE TABLE order_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        product_id INTEGER NOT NULL,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (product_id) REFERENCES products (id)
    )
    ''')

    cursor.execute('''
    CREATE TABLE price_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        product_id INTEGER NOT NULL,
        price REAL NOT NULL,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (product_id) REFERENCES products (id)
    )
    ''')
    print("Tables 'products', 'order_history', and 'price_history' created successfully.")

    for drink in SAMPLE_DRINKS:
        name, category, color, base, min_p, max_p = drink
        cursor.execute('''
        INSERT INTO products (name, category, highlight_color, base_price, current_price, min_price, max_price) 
        VALUES (?, ?, ?, ?, ?, ?, ?)
        ''', (name, category, color, base, base, min_p, max_p))
        
        product_id = cursor.lastrowid
        
        # Also add the initial price to the history
        cursor.execute('''
        INSERT INTO price_history (product_id, price)
        VALUES (?, ?)
        ''', (product_id, base))

    conn.commit()
    print(f"Database populated with {len(SAMPLE_DRINKS)} drinks.")
    conn.close()
