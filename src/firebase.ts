import { ReactNativeFirebaseAppCheckProvider, initializeAppCheck } from '@react-native-firebase/app-check';
import { getApp } from '@react-native-firebase/app';
import { getFunctions, httpsCallable } from '@react-native-firebase/functions';
import { logEvent, logAppOpen, getAnalytics } from '@react-native-firebase/analytics';
import { Platform, NativeModules } from 'react-native';

let appCheck: any = undefined;
let analytics: any = undefined


export function firebaseInit(debugToken: string) {
    // Enable debug mode for react-native-firebase:
    if (__DEV__) (globalThis as any).RNFBDebug = true;

    analytics = getAnalytics();

    const rnfbProvider = new ReactNativeFirebaseAppCheckProvider();
    rnfbProvider.configure({
        android: {
            provider: __DEV__ ? 'debug' : 'playIntegrity',
            debugToken,
        },
        apple: {
            provider: __DEV__ ? 'debug' : 'appAttestWithDeviceCheckFallback',
            debugToken,
        }
    });

    initializeAppCheck(getApp(), {
        provider: rnfbProvider,
        isTokenAutoRefreshEnabled: true,
    }).then(ac => {
        appCheck = ac
        console.log("Firebase init complete", debugToken)
        analyticEvent(AnalyticEvent.application_start);
    });
}

export async function addUserFeedback(appName: string, title: string, txt: string, email?: string) {
    const app = getApp()
    const functions = getFunctions(app, "europe-west1");
    const addUserFeedbackFunc = httpsCallable(functions, "addUserFeedback2");

    return addUserFeedbackFunc({
        appName,
        feedbackTitle: title,
        feedbackText: txt,
        email: email
    });
}


// Helper functions for categorizing data (privacy-safe)
export function categorizeCount(count: number): string {
    if (count === 0) return "0";
    if (count <= 5) return "1-5";
    if (count <= 20) return "6-20";
    return "20+";
}

export function categorizeDuration(seconds: number): string {
    if (seconds < 60) return "0-1min";
    if (seconds < 300) return "1-5min";
    if (seconds < 900) return "5-15min";
    if (seconds < 1800) return "15-30min";
    return "30min+";
}

export function categorizeSize(size: number, type: 'font' | 'stroke'): string {
    if (type === 'font') {
        if (size < 20) return "small";
        if (size < 40) return "medium";
        return "large";
    } else { // stroke
        if (size < 3) return "thin";
        if (size < 10) return "medium";
        return "thick";
    }
}

export function categorizeColor(color: string): string {
    const colorMap: { [key: string]: string } = {
        '#000000': 'black',
        '#FFFFFF': 'white',
        '#FF0000': 'red',
        '#0000FF': 'blue',
        '#FFFF00': 'yellow',
        '#00FF00': 'green',
        '#FFA500': 'orange',
        '#800080': 'purple',
        '#FFC0CB': 'pink',
    };

    const upperColor = color.toUpperCase().substring(0, 7);
    return colorMap[upperColor] || 'other';
}

export function categorizeTextLength(length: number): string {
    if (length === 0) return "0";
    if (length <= 10) return "1-10";
    if (length <= 50) return "11-50";
    if (length <= 100) return "51-100";
    return "100+";
}

export enum AnalyticEvent {
    // App Lifecycle
    application_start = "application_start",

    // Settings
    settings_open = "settings_open",
    settings_close = "settings_close",
    language_changed = "language_changed",

    // Navigation & UI
    search_performed = "search_performed",

    // Import/Export
    backup_created = "backup_created",
    backup_restored = "backup_restored",
    file_imported = "file_imported",

    // Screens
    about_screen_opened = "about_screen_opened",
}

export async function analyticEvent(eventName: AnalyticEvent | string, params?: { [key: string]: any }) {
    if (!analytics) return;

    if (eventName == AnalyticEvent.application_start) {
        // Enhanced with settings context - log as both app_open and with params
        await logAppOpen(analytics);
        if (params && Object.keys(params).length > 0) {
            return logEvent(analytics, eventName, params);
        }
        return;
    }

    return logEvent(analytics, eventName, params)
}
