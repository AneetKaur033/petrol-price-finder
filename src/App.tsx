import { useEffect } from 'react';
import { getPricesNearby } from './fuelService';

function App() {
  useEffect(() => {
    getPricesNearby(-33.8688, 151.2093) // Sydney coords for testing
      .then(data => console.log(data))
      .catch(err => console.error(err));
  }, []);

  return <div>Check the browser console for API results</div>;
}

export default App;