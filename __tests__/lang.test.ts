jest.mock('react-native-localize', () => ({ getLocales: jest.fn(() => [{ languageCode: 'en' }]) }));

import { getLocales } from 'react-native-localize';

import {
    fTranslate, getRowDirection, getRowDirections, initLang, isRTL, LANGUAGE_SETTINGS, loadLanguage, translate,
} from '../src/lang';

describe('loadLanguage', () => {
    test.each([
        [LANGUAGE_SETTINGS.hebrew, 'הורד את {1}', true],
        [LANGUAGE_SETTINGS.arabic, 'تنزيل {1}', true],
        [LANGUAGE_SETTINGS.english, 'Get {1}', false],
    ])('setting %s', (setting, expected, rtl) => {
        loadLanguage(setting);
        expect(translate('PkgGetApp')).toBe(expected);
        expect(isRTL()).toBe(rtl);
    });

    test('"default" follows the first supported device locale, else English', () => {
        (getLocales as jest.Mock).mockReturnValueOnce([{ languageCode: 'fr' }, { languageCode: 'ar' }, { languageCode: 'he' }]);
        loadLanguage(LANGUAGE_SETTINGS.default);
        expect(translate('BtnCancel')).toBe('إلغاء');

        (getLocales as jest.Mock).mockReturnValueOnce([{ languageCode: 'fr' }]);
        loadLanguage(LANGUAGE_SETTINGS.default);
        expect(translate('BtnCancel')).toBe('Cancel');
    });

    test('marks strings with a "." prefix on the simulator', () => {
        // isolated: the prefix is never cleared once set (loadLanguage only ever sets it)
        jest.isolateModules(() => {
            require('../src/device').setIsSimulator(true);
            const lang = require('../src/lang');
            lang.loadLanguage(LANGUAGE_SETTINGS.english);
            expect(lang.translate('BtnCancel')).toBe('.Cancel');
        });
    });
});

describe('translate', () => {
    test('falls back to Hebrew, then to the key itself', () => {
        initLang({ he: { OnlyInHebrew: 'רק בעברית' } }, { languageTag: 'en', isRTL: false });
        loadLanguage(LANGUAGE_SETTINGS.english);
        expect(translate('OnlyInHebrew')).toBe('רק בעברית');
        expect(translate('NoSuchKey')).toBe('NoSuchKey');
    });

    test('initLang merges app strings, the app wins on conflicts', () => {
        initLang({ en: { BtnCancel: 'Never mind', AppOnly: 'App' } }, { languageTag: 'en', isRTL: false });
        loadLanguage(LANGUAGE_SETTINGS.english);
        expect(translate('BtnCancel')).toBe('Never mind');
        expect(translate('AppOnly')).toBe('App');
        expect(translate('PkgUpdate')).toBe('Update'); // shared strings are kept
    });

    test('fTranslate fills {n} placeholders and leaves missing ones', () => {
        loadLanguage(LANGUAGE_SETTINGS.english);
        initLang({ en: { Two: '{1} and {2}' } }, { languageTag: 'en', isRTL: false });
        loadLanguage(LANGUAGE_SETTINGS.english);
        expect(fTranslate('PkgOpenIn', 'IssieDocs')).toBe('Open in IssieDocs');
        expect(fTranslate('Two', 'a')).toBe('a and {2}');
    });
});

test('row directions flip with the text direction', () => {
    loadLanguage(LANGUAGE_SETTINGS.hebrew);
    expect(getRowDirection()).toBe('row');
    expect(getRowDirections()).toMatchObject({ textAlign: 'right', direction: 'rtl' });
    loadLanguage(LANGUAGE_SETTINGS.english);
    expect(getRowDirection()).toBe('row-reverse');
    expect(getRowDirections()).toMatchObject({ textAlign: 'left', direction: 'ltr' });
});
