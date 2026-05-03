import { Process } from '@entities/process/model/types/Process';
import { ProcessTree } from '@entities/process/model/types/ProcessTree';
import {
	createTreeTableElementProcessTree
} from '@features/process/ui/process-select/helpers/createTreeTableElementProcessTree';
import { TreeTableElementProcessTree } from '@features/process/ui/process-select/types/TreeTableElementProcess';
import { TreeTableProcess } from '@features/tree-table/ui/tree-table-process/TreeTableProcess';
import ChevronDownIcon from '@shared/ui/drop-down-menu/assets/ChevronDownIcon';
import { InputWithAddon } from '@shared/ui/input-with-addon/InputWithAddon';
import { SmartIcon } from '@shared/ui/smart-icon/SmartIcon';
import classNames from 'classnames';
import {
	forwardRef,
	useEffect, useRef, useState
} from 'react';

import styles from './ProcessSelect.module.scss';

interface SectionSelectProps {
    processes: ProcessTree[];
    placeholder?: string;
    initialValue?: Process;
    onSelect?: (process: Process) => void;
    isEditable?: boolean;

    wrapperClassName?: string;
    triggerClassName?: string;
    popoverClassName?: string;
    menuClassName?: string;
}

export const ProcessSelect = forwardRef<HTMLDivElement, SectionSelectProps>(
	function SectionSelect({
		processes,
		initialValue,
		onSelect,
		isEditable = true,
		placeholder = 'Выберите раздел',
		menuClassName,
		triggerClassName,
		wrapperClassName,
		popoverClassName,
	}: SectionSelectProps, ref) {
		const [open, setOpen] = useState(false);
		const [search, setSearch] = useState('');
		const [selectProcess, setSelectProcess] = useState<Process | null>(initialValue ?? null);
		const [treeTableItems, setTreeTableItems] = useState<TreeTableElementProcessTree[]>([]);

		const anchorRef = useRef<HTMLDivElement>(null);

		useEffect(() => {
			if (!open) return;

			const onMouseDown = (e: MouseEvent) => {
				const root = anchorRef.current;
				if (!root) return;

				e.stopPropagation();

				const target = e.target as Node | null;

				if (target && root.contains(target)) return;

				setOpen(false);
			};

			document.addEventListener('mousedown', onMouseDown, true);

			return () => {
				document.removeEventListener('mousedown', onMouseDown, true);
			};
		}, [open]);

		useEffect(() => {
			const resultSections: TreeTableElementProcessTree[] = [];

			processes.forEach((process) => {
				resultSections.push(createTreeTableElementProcessTree(process));
			});

			setTreeTableItems(resultSections);
		}, [processes]);

		const onClickWrapper = () => {
			setOpen((prev) => !prev);
		};

		const onSelectItem = (item: Process | null) => {
			if (!item) return;
			
			setSelectProcess(item);

			setSearch('');
			setOpen(false);
			onSelect?.(item);
		};

		return (
			<div
				className={classNames(styles.wrapper, wrapperClassName, {
					[styles.disabled]: !isEditable,
				})}
				ref={anchorRef}
			>
				<div className={classNames(styles.trigger, triggerClassName)}
					onClick={onClickWrapper}
				>
					{
						(
							selectProcess
                            && <div className={styles.selected}>
	<span className={styles.name}>
                            		{selectProcess.name}
                            	</span>
                            </div>
						)
                        || (
                        	<span className={styles.placeholder}>{placeholder}</span>
                        )
					}

					<div className={classNames(styles.chevron, {
						[styles.disabled]: !isEditable,
					})}>
						<ChevronDownIcon rotated={open ? 180 : 0}/>
					</div>
				</div>

				<div className={classNames(styles.popoverContainer, popoverClassName, {
					[styles.open]: open,
				})}>
					<InputWithAddon
						type="text"
						containerClassName={styles.search}
						placeholder="Поиск раздела"
						value={search}
						leftAddon={<SmartIcon iconName="search"/>}
						onChange={(e) => setSearch(e.target.value)}
					/>

					<div className={classNames(styles.content, menuClassName)} ref={ref}>
						<TreeTableProcess
							data={treeTableItems}
							search={search}
							onClickItem={onSelectItem}
						/>
					</div>
				</div>
			</div>
		);
	});