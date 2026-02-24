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
        "KEY": "Value",
        "UserFeedback": "משוב משתמש",
        "FeedbackTitleLabel": "כותרת",
        "FeedbackTitlePlaceholder": "הזן כותרת קצרה",
        "TitleMinLength": "הכותרת חייבת להיות לפחות 3 תווים",
        "TitleMaxLength": "הכותרת חייבת להיות פחות מ-100 תווים",
        "FeedbackMinLength": "המשוב חייב להיות לפחות 5 תווים",
        "FeedbackMaxLength": "המשוב חייב להיות פחות מ-1000 תווים",
        "InvalidEmail": "כתובת אימייל לא תקינה",
        "FeedbackSubmitted": "המשוב נשלח בהצלחה",
        "FeedbackError": "שגיאה בשליחת המשוב. אנא נסה שוב.",
        "FeedbackPlaceholder": "ספר לנו מה אתה חושב...",
        "EmailTitle": "אימייל (אופציונלי)",
        "EmailPlaceholder": "your@email.com",
        "BtnCancel": "ביטול",
        "BtnSubmitFeedback": "שלח משוב"
    },
    "ar": {
        "KEY": "Value",
        "UserFeedback": "ملاحظات المستخدم",
        "FeedbackTitleLabel": "عنوان",
        "FeedbackTitlePlaceholder": "أدخل عنوانًا موجزًا",
        "TitleMinLength": "يجب أن يكون العنوان 3 أحرف على الأقل",
        "TitleMaxLength": "يجب أن يكون العنوان أقل من 100 حرف",
        "FeedbackMinLength": "يجب أن تكون الملاحظات 5 أحرف على الأقل",
        "FeedbackMaxLength": "يجب أن تكون الملاحظات أقل من 1000 حرف",
        "InvalidEmail": "عنوان البريد الإلكتروني غير صالح",
        "FeedbackSubmitted": "تم إرسال الملاحظات بنجاح",
        "FeedbackError": "خطأ في إرسال الملاحظات. حاول مرة أخرى.",
        "FeedbackPlaceholder": "أخبرنا برأيك...",
        "EmailTitle": "البريد الإلكتروني (اختياري)",
        "EmailPlaceholder": "your@email.com",
        "BtnCancel": "إلغاء",
        "BtnSubmitFeedback": "إرسال الملاحظات"
    },
    "en": {
        "KEY": "Value",
        "UserFeedback": "User Feedback",
        "FeedbackTitleLabel": "Title / Subject",
        "FeedbackTitlePlaceholder": "Enter a brief title or subject",
        "TitleMinLength": "Title must be at least 3 characters",
        "TitleMaxLength": "Title must be less than 100 characters",
        "FeedbackMinLength": "Feedback must be at least 5 characters",
        "FeedbackMaxLength": "Feedback must be less than 1000 characters",
        "InvalidEmail": "Invalid email address",
        "FeedbackSubmitted": "Feedback submitted successfully",
        "FeedbackError": "Error submitting feedback. Please try again.",
        "FeedbackPlaceholder": "Tell us what you think...",
        "EmailTitle": "Email (optional)",
        "EmailPlaceholder": "your@email.com",
        "BtnCancel": "Cancel",
        "BtnSubmitFeedback": "Submit Feedback"
    },
};

export function initLang(langMap: LangMap, defaultLang: CurrLang) {
    // Merge the provided langMap with existing strings
    // The provided langMap wins on conflicts
    Object.keys(langMap).forEach(lang => {
        strings[lang] = {
            ...strings[lang],
            ...langMap[lang]
        };
    });
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
