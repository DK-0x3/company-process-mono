import { AppProviders } from '@app/providers';
import AppRouter from '@app/providers/router/AppRouter';
import styles from '@app/styles/App.module.scss';

const App = () => {
	return (
		<AppProviders>
			<div className={styles.App}>
				<AppRouter />
			</div>
		</AppProviders>
	);
};

export default App;
