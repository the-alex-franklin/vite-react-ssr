import 'virtual:windi.css';
import { useState } from 'react';
import { hydrateRoot } from 'react-dom/client';

const initial_data = typeof window !== 'undefined' ? window.__INITIAL_DATA__ : null;

export default function App() {
  const [count, setCount] = useState(0);

  return (
    <div className="w-screen h-screen bg-blue-500 flex flex-col items-center justify-center">
      <div>Main</div>
      <div>{count}</div>
      <button onClick={() => setCount(count + 1)}>Increment</button>
    </div>
  );
}

if (typeof document !== 'undefined') {
  const root = document.getElementById('root')!;
  hydrateRoot(root, <App />);
}
