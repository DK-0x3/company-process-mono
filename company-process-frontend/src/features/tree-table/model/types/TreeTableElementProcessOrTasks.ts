import { Process } from '@entities/process/model/types/Process';
import { Task } from '@entities/task/model/types/Task';
import { TreeTableElement } from '@features/tree-table/model/types/TreeTableElement';

type ProcessOrTask = Process | Task;

export type TreeTableElementProcessOrTasks = TreeTableElement<ProcessOrTask>