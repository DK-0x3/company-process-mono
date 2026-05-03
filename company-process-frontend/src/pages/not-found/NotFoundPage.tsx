import routes from '@shared/config/routes';

import styles from './NotFoundPage.module.scss';

const NotFoundPage = () => {
	return (
		<div className={styles.wrapper}>
			<h1>Ошибка, страница не найдена</h1>
			<a href={routes.HOME}>На главную</a>
		</div>
	);
};

export default NotFoundPage;