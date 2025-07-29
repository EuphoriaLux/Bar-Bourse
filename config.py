import os
from dotenv import load_dotenv

load_dotenv()

# Configuration settings for the Bar Bourse application

# Price increase on order
PRICE_INCREASE_ON_ORDER = float(os.getenv('PRICE_INCREASE_ON_ORDER', 0.50))

# Interval in minutes for price decrease
PRICE_DECREASE_INTERVAL_MINUTES = int(os.getenv('PRICE_DECREASE_INTERVAL_MINUTES', 2))

# Amount for price decrease
PRICE_DECREASE_AMOUNT = float(os.getenv('PRICE_DECREASE_AMOUNT', 0.10))
