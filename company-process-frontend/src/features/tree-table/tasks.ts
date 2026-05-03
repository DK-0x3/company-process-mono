import { TreeTableElement } from '@features/tree-table/model/types/TreeTableElement';

export const tasks: TreeTableElement<string>[] = [
	{
		id: 1,
		title: 'Дмитрий',
		children: [
			{
				id: 2,
				title: 'Комплектация маршрута доставки',
				children: [
					{
						id: 4,
						title: 'Наполнение коробки',
					},
					{
						id: 3,
						title: 'Сбор документов (договор, счёт-фактура, накладная)',
					},
					{
						id: 5,
						title: 'Контроль вложения коробки с заказом покупателя',
					},
				],
			},
		],
	},
	{
		id: 6,
		title: 'Контроль документов',
		children: [
			{
				id: 7,
				title: 'Формирование отчётности по НДС'
			},
			{
				id: 8,
				title: 'Производство торта' 
			},
		],
	},
];
