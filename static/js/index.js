// static/js/index.js
import React, { useState, useEffect, useCallback, useRef } from 'react';
import ReactDOM from 'react-dom/client';

const DATA_REFRESH_INTERVAL_MS = 2000; // Update every 2 seconds
const PRICE_DECREASE_INTERVAL_MINUTES = 2;

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

const PriceChart = ({ categoryName }) => {
    const chartRef = useRef(null);
    const chartInstance = useRef(null);

    useEffect(() => {
        const fetchHistory = async () => {
            try {
                const response = await fetch(`/api/price_history/${categoryName}`);
                const data = await response.json();
                
                if (chartRef.current) {
                    const ctx = chartRef.current.getContext('2d');
                    if (chartInstance.current) {
                        chartInstance.current.destroy();
                    }
                    
                    const isTrendingUp = data.length > 1 && data[data.length - 1].price > data[0].price;
                    const borderColor = isTrendingUp ? '#ff6b6b' : '#6affb0';
                    const backgroundColor = isTrendingUp ? 'rgba(255, 107, 107, 0.1)' : 'rgba(106, 255, 176, 0.1)';

                    const chartData = {
                        labels: data.map(d => d.timestamp),
                        datasets: [{
                            label: 'Price Level',
                            data: data.map(d => d.price),
                            borderColor: borderColor,
                            backgroundColor: backgroundColor,
                            borderWidth: 2,
                            tension: 0.4,
                            pointRadius: 0,
                            fill: true
                        }]
                    };

                    chartInstance.current = new Chart(ctx, {
                        type: 'line',
                        data: chartData,
                        options: {
                            animation: false,
                            responsive: true,
                            maintainAspectRatio: false,
                            scales: {
                                x: {
                                    type: 'time',
                                    time: {
                                        unit: 'minute',
                                        displayFormats: {
                                            minute: 'h:mm a'
                                        }
                                    },
                                    ticks: {
                                        color: '#9ca3af',
                                        maxRotation: 0,
                                        autoSkip: true,
                                        maxTicksLimit: 5
                                    },
                                    grid: {
                                        display: false
                                    }
                                },
                                y: {
                                    ticks: {
                                        color: '#9ca3af',
                                        callback: (value) => `${value.toFixed(1)}€`
                                    },
                                    grid: {
                                        color: 'rgba(255, 255, 255, 0.05)'
                                    }
                                }
                            },
                            plugins: {
                                legend: {
                                    display: false
                                }
                            }
                        }
                    });
                }
            } catch (error) {
                console.error(`Failed to fetch price history for ${categoryName}:`, error);
            }
        };

        fetchHistory();
        const intervalId = setInterval(fetchHistory, DATA_REFRESH_INTERVAL_MS); // Refresh chart at the same rate as prices

        return () => {
            clearInterval(intervalId);
            if (chartInstance.current) {
                chartInstance.current.destroy();
            }
        };
    }, [categoryName]);

    return (
        <div className="chart-container">
            <canvas ref={chartRef}></canvas>
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
            <PriceChart categoryName={title} />
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

const CountdownTimer = () => {
    const [timeLeft, setTimeLeft] = useState(null);

    const fetchNextDropTime = useCallback(async () => {
        try {
            const response = await fetch('/api/next_drop_time');
            const data = await response.json();
            const nextDrop = new Date(data.next_drop_time);
            const now = new Date();
            setTimeLeft(Math.max(0, Math.floor((nextDrop - now) / 1000)));
        } catch (error) {
            console.error("Failed to fetch next drop time:", error);
        }
    }, []);

    useEffect(() => {
        fetchNextDropTime(); // Fetch initial time
        const intervalId = setInterval(() => {
            setTimeLeft(prevTime => {
                if (prevTime === null || prevTime <= 1) {
                    fetchNextDropTime(); // Refetch when timer hits 0
                    return null;
                }
                return prevTime - 1;
            });
        }, 1000);

        return () => clearInterval(intervalId);
    }, [fetchNextDropTime]);

    if (timeLeft === null) {
        return <div className="countdown-timer"><span>NEXT DROP IN</span><div>--:--</div></div>;
    }

    const minutes = Math.floor(timeLeft / 60);
    const seconds = timeLeft % 60;

    return (
        <div className="countdown-timer">
            <span>NEXT DROP IN</span>
            <div>{`${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`}</div>
        </div>
    );
};

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
            <CountdownTimer />
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
    const [status, setStatus] = useState({ message: '', type: '' });

    const placeOrder = async (productId, productName) => {
        setStatus({ message: `Ordering ${productName}...`, type: '' });
        try {
            const response = await fetch('/api/order', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ product_id: productId })
            });
            const result = await response.json();
            if (response.ok && result.success) {
                setStatus({ message: `${productName} ordered! New price: €${result.new_price.toFixed(2)}`, type: 'success' });
            } else {
                setStatus({ message: `Error: ${result.error || 'Unknown error'}`, type: 'error' });
            }
        } catch (error) {
            setStatus({ message: 'Network error. Could not place order.', type: 'error' });
        }
        setTimeout(() => setStatus({ message: '', type: '' }), 3000);
    };

    const groupedDrinks = drinks.reduce((acc, drink) => {
        const category = drink.category || 'Uncategorized';
        if (!acc[category]) {
            acc[category] = [];
        }
        acc[category].push(drink);
        return acc;
    }, {});

    const categoryOrder = ['Alcool 4cl', 'Supérieur 4cl', 'Bière 50cl', 'Bière Bouteille', 'Vin 12cl', 'Shooter 3cl', 'Sans Alcool 33cl'];
    const sortedCategories = Object.keys(groupedDrinks).sort((a, b) => categoryOrder.indexOf(a) - categoryOrder.indexOf(b));

    return (
        <div className="admin-panel">
            <h2>Record an Order</h2>
            {sortedCategories.map(categoryName => (
                <div key={categoryName} className="admin-category">
                    <h3>{categoryName}</h3>
                    <div className="order-grid">
                        {groupedDrinks[categoryName]
                            .sort((a, b) => a.name.localeCompare(b.name))
                            .map(product => (
                                <button
                                    className="order-btn"
                                    key={product.id}
                                    onClick={() => placeOrder(product.id, product.name)}
                                >
                                    {product.name}
                                </button>
                            ))}
                    </div>
                </div>
            ))}
            <div className={`status-message ${status.type}`}>{status.message}</div>
        </div>
    );
};

// --- Main App Component ---
const App = () => {
    const [drinks, setDrinks] = useState([]);
    const [route, setRoute] = useState(window.location.hash || '#/');
    const [lastUpdated, setLastUpdated] = useState(new Date());
    const [error, setError] = useState(null);

    const fetchPrices = useCallback(async () => {
        try {
            const response = await fetch('/api/prices');
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const data = await response.json();
            setDrinks(data);
            setLastUpdated(new Date()); // Update the clock on successful fetch
            setError(null); // Clear any previous errors
        } catch (error) {
            console.error("Failed to fetch prices:", error);
            setError("Could not connect to the server. Please try again later.");
        }
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
                {error ? <div className="error-message">{error}</div> : renderRoute()}
            </main>
        </div>
    );
};

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);
