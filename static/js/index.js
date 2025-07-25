// static/js/index.js
import React, { useState, useEffect, useCallback, useRef } from 'react';
import ReactDOM from 'react-dom/client';

const DATA_REFRESH_INTERVAL_MS = 3000;

// --- Custom Hook to track previous state (for animations) ---
function usePrevious(value) {
    const ref = useRef();
    useEffect(() => {
        ref.current = value;
    }, [value]);
    return ref.current;
}

// --- Components ---

const DrinkRow = ({ drink, prevDrink, isPopular }) => {
    const { name, highlight_color, current_price, last_change, base_price } = drink;
    const [flashClass, setFlashClass] = useState('');

    useEffect(() => {
        if (prevDrink && drink.current_price !== prevDrink.current_price) {
            const direction = drink.current_price > prevDrink.current_price ? 'flash-up' : 'flash-down';
            setFlashClass(direction);
            const timer = setTimeout(() => setFlashClass(''), 700);
            return () => clearTimeout(timer);
        }
    }, [drink.current_price, prevDrink]);

    const change_class = last_change > 0 ? 'price-change-up' : last_change < 0 ? 'price-change-down' : '';
    const formatted_change = last_change > 0 ? `+${last_change.toFixed(2)}` : last_change.toFixed(2);
    const nameClass = `drink-name ${highlight_color ? `highlight-${highlight_color}` : ''}`;

    // Calculate trend compared to base price
    const priceDiff = current_price - base_price;
    const priceChangePercent = ((priceDiff / base_price) * 100).toFixed(1);
    let trendIcon = '●';
    let trendClass = 'trend-neutral';
    
    if (priceDiff > 0.1) {
        trendIcon = '▲';
        trendClass = 'price-change-up';
    } else if (priceDiff < -0.1) {
        trendIcon = '▼';
        trendClass = 'price-change-down';
    }

    return (
        <div className={`drink-row ${flashClass} ${isPopular ? 'popular-drink' : ''}`}>
            <span className={nameClass}>{name}</span>
            <div className="price-details">
                <span className={`trend-indicator ${trendClass}`}>
                    <span className="trend-arrow">{trendIcon}</span>
                    <span>{priceChangePercent}%</span>
                </span>
                <span className="drink-price">{current_price.toFixed(1)}€</span>
                <span className={`price-change ${change_class}`}>{last_change !== 0 && formatted_change}</span>
            </div>
        </div>
    );
};

const DrinkCategory = ({ title, drinks, prevDrinksMap, orderCounts }) => {
    const categoryClass = `category-${title.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')}`;
    
    return (
        <div className={`widget-panel ${categoryClass}`}>
            <h2 className="widget-title">
                <span className="category-icon"></span>
                {title}
            </h2>
            <div className="drink-list">
                {drinks.map(drink => (
                    <DrinkRow 
                        key={drink.id} 
                        drink={drink} 
                        prevDrink={prevDrinksMap.get(drink.id)} 
                        isPopular={orderCounts && orderCounts[drink.id] >= 3}
                    />
                ))}
            </div>
        </div>
    );
};

const HowItWorksWidget = () => (
    <div className="widget-panel how-it-works-widget">
        <h2 className="widget-title">How It Works</h2>
        <ul>
            <li className="trend-up"><strong>High Demand:</strong> When a drink is popular, its price goes UP!</li>
            <li className="trend-down"><strong>Low Demand:</strong> All prices slowly drop over time. Watch for a bargain!</li>
            <li className="trend-fair"><strong>Fair Play:</strong> Prices are capped to keep the game fun and profitable for everyone.</li>
        </ul>
    </div>
);

const BoardHeader = ({ lastUpdated }) => (
    <header className="board-header">
        <h1>BAR BOURSE</h1>
        <div className="header-info">
            <div className="live-indicator">
                <div className="dot"></div>
                <span>MARKET IS LIVE</span>
            </div>
            <div className="last-updated">
                <span>LAST UPDATED</span>
                <div>{lastUpdated.toLocaleTimeString()}</div>
            </div>
        </div>
    </header>
);

const PublicDisplay = ({ drinks, lastUpdated }) => {
    const prevDrinks = usePrevious(drinks);
    const prevDrinksMap = new Map(prevDrinks?.map(d => [d.id, d]));
    const [orderCounts, setOrderCounts] = useState({});

    const groupedDrinks = drinks.reduce((acc, drink) => {
        const category = drink.category || 'Uncategorized';
        if (!acc[category]) acc[category] = [];
        acc[category].push(drink);
        return acc;
    }, {});
    
    const categoryOrder = ['Alcool 4cl', 'Supérieur 4cl', 'Bière 50cl', 'Bière Bouteille', 'Vin 12cl', 'Shooter 3cl', 'Sans Alcool 33cl'];
    const sortedCategories = Object.keys(groupedDrinks).sort((a, b) => categoryOrder.indexOf(a) - categoryOrder.indexOf(b));

    const fetchPopularDrinks = useCallback(async () => {
        try {
            const response = await fetch('/api/popular');
            const data = await response.json();
            setOrderCounts(data);
        } catch (error) {
            console.error("Failed to fetch popular drinks:", error);
        }
    }, []);

    useEffect(() => {
        fetchPopularDrinks();
        const intervalId = setInterval(fetchPopularDrinks, 10000); // Update every 10 seconds
        return () => clearInterval(intervalId);
    }, [fetchPopularDrinks]);

    return (
        <>
            <BoardHeader lastUpdated={lastUpdated} />
            <div className="price-board-dashboard">
                {sortedCategories.map(categoryName => (
                    <DrinkCategory 
                        key={categoryName} 
                        title={categoryName} 
                        drinks={groupedDrinks[categoryName]} 
                        prevDrinksMap={prevDrinksMap}
                        orderCounts={orderCounts}
                    />
                ))}
                <HowItWorksWidget />
            </div>
        </>
    );
};

const AdminInterface = ({ drinks }) => {
    /* This component is unchanged and remains for backend use */
    const [status, setStatus] = useState({message: '', type: ''});
    const placeOrder = async (productId, productName) => {
      setStatus({message: `Ordering ${productName}...`, type: ''});
      try {
          const response = await fetch('/api/order', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ product_id: productId }) });
          const result = await response.json();
          if (response.ok && result.success) {
              setStatus({message: `${productName} ordered! New price: €${result.new_price.toFixed(2)}`, type: 'success'});
          } else { setStatus({message: `Error: ${result.error || 'Unknown error'}`, type: 'error'}); }
      } catch (error) { setStatus({message: 'Network error. Could not place order.', type: 'error'}); }
      setTimeout(() => setStatus({message: '', type: ''}), 3000);
    };
    const sortedDrinks = [...drinks].sort((a,b) => a.name.localeCompare(b.name));
    return (
      <div className="admin-panel">
        <h2>Record an Order</h2>
        <div className="order-grid">
          {sortedDrinks.map(product => (<button className="order-btn" key={product.id} onClick={() => placeOrder(product.id, product.name)}>{product.name}</button>))}
        </div>
         <div className={`status-message ${status.type}`}>{status.message}</div>
      </div>
    );
};

// --- Main App Component ---
const App = () => {
    const [drinks, setDrinks] = useState([]);
    const [route, setRoute] = useState(window.location.hash || '#/');
    const [lastUpdated, setLastUpdated] = useState(new Date());

    const fetchPrices = useCallback(async () => {
        try {
            const response = await fetch('/api/prices');
            const data = await response.json();
            setDrinks(data);
            setLastUpdated(new Date()); // Update the clock on successful fetch
        } catch (error) { console.error("Failed to fetch prices:", error); }
    }, []);

    useEffect(() => {
        fetchPrices();
        const intervalId = setInterval(fetchPrices, DATA_REFRESH_INTERVAL_MS);
        return () => clearInterval(intervalId);
    }, [fetchPrices]);

    useEffect(() => {
        const handleHashChange = () => setRoute(window.location.hash || '#/');
        window.addEventListener('hashchange', handleHashChange);
        return () => window.removeEventListener('hashchange', handleHashChange);
    }, []);

    const renderRoute = () => {
        switch (route) {
            case '#/admin': return <AdminInterface drinks={drinks} />;
            case '#/':
            default: return <PublicDisplay drinks={drinks} lastUpdated={lastUpdated} />;
        }
    };
    
    // The admin view will still use the simple info-view layout
    const appClassName = route === '#/' ? 'price-board-view' : 'info-view';

    return (
        <div className={appClassName}>
             {/* Main nav is only for non-public views */}
            {route !== '#/' && (
                 <nav className="main-nav">
                    <a href="#/" >Price Board</a>
                    <a href="#/admin" className={route === '#/admin' ? 'active' : ''}>Admin Panel</a>
                </nav>
            )}
            <main>
                {renderRoute()}
            </main>
        </div>
    );
};

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);
