/*
 * Copyright (C) Contributors to the Suwayomi project
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { useTranslation } from 'react-i18next';
import { BaseSyntheticEvent, MouseEvent, TouchEvent, ChangeEvent, useMemo, forwardRef, ForwardedRef } from 'react';
import Button from '@mui/material/Button';
import Checkbox from '@mui/material/Checkbox';
import IconButton from '@mui/material/IconButton';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import { PopupState } from 'material-ui-popup-state/hooks';
import { bindTrigger } from 'material-ui-popup-state';
import { CustomTooltip } from '@/modules/core/components/CustomTooltip.tsx';
import { SelectableCollectionReturnType } from '@/modules/collection/hooks/useSelectableCollection.ts';
import { MediaQuery } from '@/modules/core/utils/MediaQuery.tsx';
import { MangaType } from '@/lib/graphql/generated/graphql.ts';

export const MangaOptionButton = forwardRef(
    (
        {
            id,
            selected,
            handleSelection,
            asCheckbox = false,
            popupState,
        }: {
            id: number;
            selected?: boolean | null;
            handleSelection?: SelectableCollectionReturnType<MangaType['id']>['handleSelection'];
            asCheckbox?: boolean;
            popupState: PopupState;
        },
        ref: ForwardedRef<HTMLButtonElement | null>,
    ) => {
        const { t } = useTranslation();

        const isTouchDevice = MediaQuery.useIsTouchDevice();

        const bindTriggerProps = useMemo(() => bindTrigger(popupState), [popupState]);

        const preventDefaultAction = (e: BaseSyntheticEvent) => {
            e.stopPropagation();
            e.preventDefault();
        };

        const handleSelectionChange = (e: ChangeEvent, isSelected: boolean) => {
            preventDefaultAction(e);
            handleSelection?.(id, isSelected);
        };

        const handleClick = (e: MouseEvent | TouchEvent) => {
            if (isTouchDevice) return;

            preventDefaultAction(e);
            popupState.open(e);
            bindTriggerProps.onClick(e as any);
        };

        if (!handleSelection) {
            return null;
        }

        const isSelected = selected !== null;
        if (isSelected) {
            if (!asCheckbox) {
                return null;
            }

            return (
                <CustomTooltip title={t(selected ? 'global.button.deselect' : 'global.button.select')}>
                    <Checkbox checked={selected} onMouseDown={preventDefaultAction} onChange={handleSelectionChange} />
                </CustomTooltip>
            );
        }

        if (asCheckbox) {
            return (
                <CustomTooltip title={t('global.button.options')}>
                    <IconButton
                        ref={ref}
                        {...bindTriggerProps}
                        onClick={handleClick}
                        aria-label="more"
                        size="large"
                        onMouseDown={preventDefaultAction}
                    >
                        <MoreVertIcon />
                    </IconButton>
                </CustomTooltip>
            );
        }

        return (
            <CustomTooltip title={t('global.button.options')}>
                <Button
                    ref={ref}
                    {...bindTriggerProps}
                    onClick={handleClick}
                    className="manga-option-button"
                    size="small"
                    variant="contained"
                    sx={{
                        minWidth: 'unset',
                        paddingX: '0',
                        paddingY: '2.5px',
                        visibility: popupState.isOpen ? 'visible' : 'hidden',
                        pointerEvents: 'none',
                        '@media not (pointer: fine)': {
                            visibility: 'hidden',
                            pointerEvents: undefined,
                        },
                    }}
                    onMouseDown={(e) => e.stopPropagation()}
                >
                    <MoreVertIcon />
                </Button>
            </CustomTooltip>
        );
    },
);
