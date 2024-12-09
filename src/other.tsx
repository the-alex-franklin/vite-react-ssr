import 'virtual:windi.css';
import { hydrateRoot } from 'react-dom/client';
import { z } from 'zod';

const initial_data = typeof window !== 'undefined' ? window.__INITIAL_DATA__ : null;
const parsed_data = z.object({}).passthrough().nullish().parse(initial_data);

export default function Other() {
  return (
    <div className="w-screen h-screen bg-green-500">
      Test
      {parsed_data && <pre>{JSON.stringify(parsed_data, null, 2)}</pre>}
    </div>
  );
}

if (typeof document !== 'undefined') {
  const root = document.getElementById('root')!;
  hydrateRoot(root, <Other />);
}
