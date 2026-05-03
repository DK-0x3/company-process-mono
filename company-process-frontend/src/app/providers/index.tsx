import { queryClient } from '@app/providers/queryClient';
import store, { persistor } from '@app/store/store';
import { QueryClientProvider } from '@tanstack/react-query';
import { ReactNode } from 'react';
import { Toaster } from 'react-hot-toast';
import { Provider } from 'react-redux';
import { BrowserRouter } from 'react-router-dom';
import { PersistGate } from 'redux-persist/integration/react';

export const AppProviders = ({ children }: { children: ReactNode }) => {
	return (
		<Provider store={store}>
			<PersistGate persistor={persistor} loading={<div>Loading...</div>}>
				<QueryClientProvider client={queryClient}>
					<BrowserRouter>
						{children}
					</BrowserRouter>
					<Toaster position="top-center" />
				</QueryClientProvider>
			</PersistGate>
		</Provider>
	);
};
