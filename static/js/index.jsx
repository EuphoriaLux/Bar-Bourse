// static/js/index.jsx
import React, { useState, useEffect, useCallback, useRef } from 'react';
import ReactDOM from 'react-dom/client';

// --- CONFIGURATION (Client-side) ---
const DATA_REFRESH_INTERVAL_MS = 3000; // Refresh data every 3 seconds

// --- HOOKS ---
function usePrevious(value) {
    const ref = useRef();
    useEffect(() => {
        ref.current = value;
    }, [value]);
    return ref.current;
}

// --- COMPONENTS ---

const DrinkRow = ({ drink, prevDrink }) => {
    // This component remains the same as your version
    const [flashClass, setFlashClass] = useState('');

    useEffect(() => {
        if (prevDrink && drink.current_price !== prevDrink.current_price) {
            const direction = drink.current_price > prevDrink.current_price ? 'flash-up' : 'flash-down';
            setFlashClass(direction);
            const timer = setTimeout(() => setFlashClass(''), 700);
            return () => clearTimeout(timer);
        }
    }, [drink.current_price, prevDrink]);
    
    let trendClass = '';
    let trendIcon = '—';
    if (drink.current_price > drink.base_price) {
        trendClass = 'price-up';
        trendIcon = '▲';
    } else if (drink.current_price < drink.base_price) {
        trendClass = 'price-down';
        trendIcon = '▼';
    }

    return (
        <div className={`drink-row price-board-grid ${flashClass}`}>
            <span className="drink-name">{drink.name}</span>
            <span className={`trend-icon ${trendClass}`} aria-hidden="true">{trendIcon}</span>
            <span className={`drink-price ${trendClass}`}>
                €{drink.current_price.toFixed(2)}
            </span>
        </div>
    );
};

// PublicDisplay now receives drinks as a prop
const PublicDisplay = ({ drinks }) => {
  const prevDrinks = usePrevious(drinks);
  const sortedDrinks = [...drinks].sort((a, b) => b.current_price - a.current_price);
  const prevDrinksMap = new Map(prevDrinks?.map(d => [d.id, d]));

  return (
    <div className="price-board" aria-live="polite">
      <div className="price-board-header price-board-grid">
        <span>Drink</span>
        <span className="trend-col">Trend</span>
        <span className="price-col">Price</span>
      </div>
      {sortedDrinks.map(drink => (
        <DrinkRow key={drink.id} drink={drink} prevDrink={prevDrinksMap.get(drink.id)} />
      ))}
    </div>
  );
};

// AdminInterface now receives drinks as a prop and calls the API
const AdminInterface = ({ drinks }) => {
  const [status, setStatus] = useState({message: '', type: ''});

  const placeOrder = async (productId, productName) => {
    setStatus({message: `Ordering ${productName}...`, type: ''});
    
    try {
        const response = await fetch('/api/order', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ product_id: productId })
        });
        const result = await response.json();

        if (response.ok && result.success) {
            setStatus({message: `${productName} ordered! New price: €${result.new_price.toFixed(2)}`, type: 'success'});
            // Note: We don't need to manually update state here.
            // The polling in the main App component will fetch the new price.
        } else {
            setStatus({message: `Error: ${result.error || 'Unknown error'}`, type: 'error'});
        }
    } catch (error) {
        console.error("Failed to place order", error);
        setStatus({message: 'Network error. Could not place order.', type: 'error'});
    }

    setTimeout(() => setStatus({message: '', type: ''}), 3000);
  };
  
  const sortedDrinks = [...drinks].sort((a,b) => a.name.localeCompare(b.name));

  return (
    <div className="admin-panel">
      <h2>Record an Order</h2>
      <div className="order-grid">
        {sortedDrinks.map(product => (
          <button
            className="order-btn"
            key={product.id}
            onClick={() => placeOrder(product.id, product.name)}
            aria-label={`Order ${product.name}`}
          >
            {product.name}
          </button>
        ))}
      </div>
       <div 
        className={`status-message ${status.type}`} 
        aria-live="assertive"
        role="status"
       >
        {status.message}
      </div>
    </div>
  );
};

// The main App component now fetches data from the server and passes it down
const App = () => {
  const [drinks, setDrinks] = useState([]);
  const [route, setRoute] = useState(window.location.hash || '#/');

  // Fetches prices from the Flask API
  const fetchPrices = useCallback(async () => {
    try {
      const response = await fetch('/api/prices');
      const data = await response.json();
      setDrinks(data);
    } catch (error) {
      console.error("Failed to fetch prices:", error);
    }
  }, []);

  // Set up polling to get live data
  useEffect(() => {
    fetchPrices(); // Fetch immediately on load
    const intervalId = setInterval(fetchPrices, DATA_REFRESH_INTERVAL_MS);
    return () => clearInterval(intervalId); // Cleanup on unmount
  }, [fetchPrices]);

  // Client-side routing logic (unchanged)
  useEffect(() => {
    const handleHashChange = () => setRoute(window.location.hash || '#/');
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  const renderRoute = () => {
    switch (route) {
      case '#/admin':
        return <AdminInterface drinks={drinks} />;
      case '#/':
      default:
        return <PublicDisplay drinks={drinks} />;
    }
  };

  return (
    <>
      <header>
        <h1>BAR BOURSE</h1>
        <div className="live-indicator-wrapper">
            <span className="live-indicator" aria-hidden="true">●</span>
            <span>Market is Live</span>
        </div>
        <nav>
          <a href="#/" className={route !== '#/admin' ? 'active' : ''}>Price Board</a>
          <a href="#/admin" className={route === '#/admin' ? 'active' : ''}>Admin Panel</a>
        </nav>
      </header>
      <main>
        {renderRoute()}
      </main>
    </>
  );
};

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);