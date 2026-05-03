import React from 'react';

interface DropDownMenuItem<ValueT> {
    /** Значение элемента с уникальным идентификатором */
    value: ValueT;
    /** Контент элемента, может быть React-нодой */
    label: React.ReactNode;
    /** Заблокирован ли элемент */
    disabled?: boolean;
    /** Иконка слева от текста */
    icon?: React.ReactNode;
}

export default DropDownMenuItem;