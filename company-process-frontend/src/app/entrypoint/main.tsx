import '@app/styles/index.scss';
import 'react-loading-skeleton/dist/skeleton.css';

import App from '@app/ui/App';
import { createRoot } from 'react-dom/client';

createRoot(document.getElementById('root')!).render(
	<App />
);
