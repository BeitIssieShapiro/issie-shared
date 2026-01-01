import { getLocales } from "react-native-localize";
import { isSimulator } from "./device";
import { trace } from "./log";
export let gCurrentLang = { languageTag: "he", isRTL: true }
const DEFAULT_LANG = "he";
let gPrefix = "";

export const LANGUAGE_SETTINGS = {
    name: 'language',
    default: 1,
    hebrew: 2,
    arabic: 3,
    english: 4
}

type LangMap = Record<string, Record<string, string>>;
type CurrLang = { languageTag: string, isRTL: boolean };

let strings: LangMap = {
    "he": {
        "KEY": "Value"
    },
    "ar": {
        "KEY": "Value"
    },
    "en": {
        "KEY": "Value"
    },
};

export function initLang(langMap: LangMap, defaultLang: CurrLang) {
    strings = langMap;
    gCurrentLang = defaultLang;
}

export function findMissingTranslations() {
    let missing = ""
    //English
    console.log("Missing in English:")
    Object.entries(strings.he).forEach(([key, value]) => {
        if (!strings.en[key]) {
            missing += "\"" + key + "\":" + "\"" + value + "\",\n";
        }
    })
    console.log(missing);
    missing = "";
    console.log("\n\nMissing in Arabic:")
    Object.entries(strings.he).forEach(([key, value]) => {
        if (!strings.ar[key]) {
            missing += "\"" + key + "\":" + "\"" + value + "\",\n";
        }
    })
    console.log(missing);

    missing = "";
    console.log("\n\nMissing in Hebrew:")
    Object.entries(strings.en).forEach(([key, value]) => {
        if (!strings.he[key]) {
            missing += "\"" + key + "\":" + "\"" + value + "\",\n";
        }
    })
    console.log(missing);

}

let currStrings = strings[DEFAULT_LANG];


export function loadLanguage(langSetting: number) {
    trace("langauge loaded", langSetting, langSetting + "" === LANGUAGE_SETTINGS.default + "")
    if (langSetting == undefined || langSetting == null || langSetting === LANGUAGE_SETTINGS.default) {
        const locales = getLocales();
        langSetting = LANGUAGE_SETTINGS.english;

        for (let i = 0; i < locales.length; i++) {
            if (locales[i].languageCode === "en") {
                langSetting = LANGUAGE_SETTINGS.english;
                break;
            } else if (locales[i].languageCode === "he") {
                langSetting = LANGUAGE_SETTINGS.hebrew;
                break;
            } else if (locales[i].languageCode === "ar") {
                langSetting = LANGUAGE_SETTINGS.arabic;
                break;
            }
        }
    }

    switch (langSetting) {
        case LANGUAGE_SETTINGS.hebrew:
            gCurrentLang = { languageTag: "he", isRTL: true }
            break;
        case LANGUAGE_SETTINGS.arabic:
            gCurrentLang = { languageTag: "ar", isRTL: true }
            break;
        case LANGUAGE_SETTINGS.english:
            gCurrentLang = { languageTag: "en", isRTL: false }
            break;
        default:
            gCurrentLang = { languageTag: "he", isRTL: true }
            break;

    }

    currStrings = strings[gCurrentLang.languageTag];
    if (!currStrings) {
        //remove the specifics
        let tag = gCurrentLang.languageTag.split("-");

        if (tag.length == 2) {
            currStrings = strings[tag[0]];
        }
        //default
        if (!currStrings) {
            currStrings = strings[DEFAULT_LANG];
        }
    }

    if (isSimulator()) {
        gPrefix = "."
    }
}

export function isRTL() {
    return gCurrentLang.isRTL;
}

export function getRowDirection() {
    return isRTL() ? "row" : "row-reverse";
}

export function getRowReverseDirection() {
    return isRTL() ? "row-reverse" : "row";
}

export function getRowDirections() {
    return isRTL() ?
        {
            row: 'row', rowReverse: 'row-reverse', flexStart: 'flex-start',
            flexEnd: 'flex-end', textAlign: 'right', rtl: true, direction: 'rtl'
        } :
        {
            row: 'row-reverse', rowReverse: 'row', flexStart: 'flex-end',
            flexEnd: 'flex-start', textAlign: 'left', rtl: false, direction: 'ltr'
        };
}

export function getFlexStart() {
    return isRTL() ? "flex-start" : "flex-end";
}

export function getFlexEnd() {
    return isRTL() ? "flex-end" : "flex-start";
}

export function translate(id: string) {
    let s = currStrings[id];
    if (!s) {
        //not found, defaults to hebrew
        s = strings[DEFAULT_LANG][id];
        if (!s) {
            s = id;
        }
    }

    return gPrefix + s;
}

export function fTranslate(id: string, ...args: string[]) {
    return replaceArgs(translate(id), args);
}



function replaceArgs(s: string, args: string[]) {
    return s.replace(/{(\d+)}/g, function (match, number) {
        return typeof args[number - 1] != 'undefined'
            ? args[number - 1]
            : match
            ;
    });
}
