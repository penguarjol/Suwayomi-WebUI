/*
 * Copyright (C) Contributors to the Suwayomi project
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import Stack from '@mui/material/Stack';
import { useTranslation } from 'react-i18next';
import { IReaderSettings } from '@/modules/reader/types/Reader.types.ts';
import { CheckboxInput } from '@/modules/core/components/inputs/CheckboxInput.tsx';
import { TranslationKey } from '@/Base.types.ts';
import { SliderInput } from '@/modules/core/components/inputs/SliderInput.tsx';

import {
    DEFAULT_READER_SETTINGS,
    READER_BLEND_MODE_VALUE_TO_DISPLAY_DATA,
    READER_BLEND_MODE_VALUES,
} from '@/modules/reader/constants/ReaderSettings.constants.tsx';
import { ButtonSelectInput } from '@/modules/core/components/inputs/ButtonSelectInput.tsx';

type RGBAType = Exclude<keyof IReaderSettings['customFilter']['rgba']['value'], 'blendMode'>;

const RGBA_TYPE_TO_TRANSLATION_KEY: Record<RGBAType, TranslationKey> = {
    red: 'reader.settings.custom_filter.rgba.red',
    green: 'reader.settings.custom_filter.rgba.green',
    blue: 'reader.settings.custom_filter.rgba.blue',
    alpha: 'reader.settings.custom_filter.rgba.alpha',
};

const RGBA_TYPE_TO_MAX_VALUE: Record<RGBAType, number> = {
    red: 255,
    green: 255,
    blue: 255,
    alpha: 100,
};

export const ReaderSettingRGBA = ({
    rgba,
    updateSetting,
}: Pick<IReaderSettings['customFilter'], 'rgba'> & {
    updateSetting: <Filter extends keyof IReaderSettings['customFilter']>(
        filter: Filter,
        value: IReaderSettings['customFilter'][Filter],
        commit: boolean,
    ) => void;
}) => {
    const { t } = useTranslation();

    return (
        <Stack>
            <CheckboxInput
                label={t('reader.settings.custom_filter.rgba.title')}
                checked={rgba.enabled}
                onChange={(_, checked) => updateSetting('rgba', { ...rgba, enabled: checked }, true)}
            />
            {rgba.enabled && (
                <Stack sx={{ gap: 1 }}>
                    {Object.entries(rgba.value).map(([key, value]) => {
                        if (key === 'blendMode') {
                            return null;
                        }

                        return (
                            <SliderInput
                                key={key}
                                label={t(RGBA_TYPE_TO_TRANSLATION_KEY[key as RGBAType])}
                                value={value}
                                onDefault={() =>
                                    updateSetting(
                                        'rgba',
                                        {
                                            ...rgba,
                                            value: {
                                                ...rgba.value,
                                                [key]: DEFAULT_READER_SETTINGS.customFilter.rgba.value[key as RGBAType],
                                            },
                                        },
                                        true,
                                    )
                                }
                                slotProps={{
                                    slider: {
                                        value,
                                        defaultValue: DEFAULT_READER_SETTINGS.customFilter.rgba.value[key as RGBAType],
                                        step: 1,
                                        min: 0,
                                        max: RGBA_TYPE_TO_MAX_VALUE[key as RGBAType],
                                        onChange: (_, newValue) => {
                                            updateSetting(
                                                'rgba',
                                                { ...rgba, value: { ...rgba.value, [key]: newValue } },
                                                false,
                                            );
                                        },
                                        onChangeCommitted: (_, newValue) => {
                                            updateSetting(
                                                'rgba',
                                                { ...rgba, value: { ...rgba.value, [key]: newValue } },
                                                true,
                                            );
                                        },
                                    },
                                }}
                            />
                        );
                    })}
                    <ButtonSelectInput
                        label={t('reader.settings.custom_filter.rgba.blend_mode.title')}
                        value={rgba.value.blendMode}
                        values={READER_BLEND_MODE_VALUES}
                        setValue={(value) =>
                            updateSetting(
                                'rgba',
                                {
                                    ...rgba,
                                    value: { ...rgba.value, blendMode: value },
                                },
                                true,
                            )
                        }
                        valueToDisplayData={READER_BLEND_MODE_VALUE_TO_DISPLAY_DATA}
                    />
                </Stack>
            )}
        </Stack>
    );
};
