/*
 * Copyright (C) Contributors to the Suwayomi project
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import React, { useState, useEffect } from 'react';
import SearchIcon from '@mui/icons-material/Search';
import IconButton from '@mui/material/IconButton';
import { useQueryParam, StringParam } from 'use-query-params';
import { useTranslation } from 'react-i18next';
import { useLocation } from 'react-router-dom';
import { useTheme } from '@mui/material/styles';
import { CustomTooltip } from '@/modules/core/components/CustomTooltip.tsx';
import { SearchTextField } from '@/modules/core/components/inputs/SearchTextField.tsx';

interface IProps {
    isClosable?: boolean;
}

export const AppbarSearch: React.FunctionComponent<IProps> = (props) => {
    const { isClosable = true } = props;

    const theme = useTheme();
    const { t } = useTranslation();

    const [prevLocationKey, setPrevLocationKey] = useState<string>();
    const location = useLocation();

    const [query, setQuery] = useQueryParam('query', StringParam);
    const [isSearchOpen, setIsSearchOpen] = useState(!isClosable || !!query);
    const inputRef = React.useRef<HTMLInputElement>();

    const [searchString, setSearchString] = useState(query ?? '');

    if (prevLocationKey !== location.key) {
        setPrevLocationKey(location.key);
        setSearchString(query ?? '');
        setIsSearchOpen(!isClosable || !!query);
    }

    const isOpen = isSearchOpen || !!query;

    const updateSearchOpenState = (open: boolean) => {
        if (!isClosable) {
            return;
        }

        setIsSearchOpen(open);

        // try to focus input component since in case of navigating to the previous/next page in the browser history
        // the "openSearch" state might not change and thus, won't trigger a focus
        if (open) {
            inputRef.current?.focus();
        }
    };

    function handleChange(newQuery: string) {
        if (newQuery === '') {
            return;
        }

        setQuery(newQuery);
        updateSearchOpenState(false);
    }

    const cancelSearch = () => {
        setSearchString('');
        setQuery(undefined);
        updateSearchOpenState(false);
    };
    const handleBlur = () => {
        if (!searchString) updateSearchOpenState(false);
    };

    const handleKeyboardEvent = (e: KeyboardEvent) => {
        if (e.key === 'F3' || (e.ctrlKey && e.key === 'f')) {
            e.preventDefault();
            updateSearchOpenState(true);
        }
    };

    useEffect(() => {
        window.addEventListener('keydown', handleKeyboardEvent);

        return () => {
            window.removeEventListener('keydown', handleKeyboardEvent);
        };
    }, [handleKeyboardEvent]);

    if (isOpen) {
        return (
            <SearchTextField
                autoFocus
                variant="standard"
                value={searchString}
                onCancel={cancelSearch}
                onChange={(e) => setSearchString(e.target.value)}
                onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                        handleChange(searchString);
                    }
                }}
                onBlur={handleBlur}
                inputRef={inputRef}
                sx={{
                    ...theme.applyStyles('light', {
                        '& .MuiInput-underline:before': {
                            borderBottomColor: 'primary.contrastText', // Default color
                        },
                        '& .MuiInput-underline:hover:before': {
                            borderBottomColor: 'primary.contrastText', // Hover color
                        },
                        '& .MuiInput-underline:after': {
                            borderBottomColor: 'primary.dark', // Focused color
                        },
                    }),
                }}
                cancelButtonProps={{ sx: { ...theme.applyStyles('light', { color: 'primary.contrastText' }) } }}
            />
        );
    }

    return (
        <CustomTooltip title={t('search.title.search')}>
            <IconButton onClick={() => updateSearchOpenState(true)} color="inherit">
                <SearchIcon />
            </IconButton>
        </CustomTooltip>
    );
};
