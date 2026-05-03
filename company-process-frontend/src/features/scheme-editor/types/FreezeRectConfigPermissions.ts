import { RectComponentConfig } from '@features/scheme-editor/components/rect-component/RectComponent';

export type FreezeRectConfigPermissions = {
    [K in keyof RectComponentConfig]: boolean;
};