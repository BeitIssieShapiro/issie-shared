import React, { useEffect, useState } from 'react';
import { Alert, Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { isRTL } from './lang';

export interface IssieAlertButton {
    text: string;
    onPress?: () => void;
    style?: 'default' | 'cancel' | 'destructive';
}

interface AlertConfig {
    title: string;
    message?: string;
    buttons: IssieAlertButton[];
}

let showAlert: ((config: AlertConfig) => void) | null = null;

/**
 * Like Alert.alert, but in the app's text direction: the system alert aligns its text by the
 * device language, so a Hebrew or Arabic app on an English device shows it left-aligned.
 * Falls back to Alert.alert when no <IssieAlertHost/> is mounted.
 */
export function issieAlert(title: string, message?: string, buttons: IssieAlertButton[] = [{ text: 'OK' }]) {
    if (showAlert) {
        showAlert({ title, message, buttons });
    } else {
        Alert.alert(title, message, buttons);
    }
}

/** Mount once at the app root, after the app's content. */
export function IssieAlertHost() {
    const [config, setConfig] = useState<AlertConfig | undefined>();

    useEffect(() => {
        showAlert = setConfig;
        return () => { showAlert = null; };
    }, []);

    if (!config) return null;

    const rtl = isRTL();
    const textDirection = { writingDirection: rtl ? 'rtl' : 'ltr', textAlign: rtl ? 'right' : 'left' } as const;
    const vertical = config.buttons.length >= 3;

    const press = (button: IssieAlertButton) => {
        setConfig(undefined);
        // after the fade-out: iOS refuses to present (e.g. a share sheet) while a modal is closing
        if (button.onPress) setTimeout(button.onPress, 400);
    };
    const cancel = config.buttons.find(b => b.style === 'cancel');

    return (
        <Modal visible transparent animationType="fade" onRequestClose={() => press(cancel ?? { text: '' })}
            supportedOrientations={['portrait', 'portrait-upside-down', 'landscape', 'landscape-left', 'landscape-right']}>
            <View style={styles.overlay}>
                <View style={styles.box}>
                    <Text allowFontScaling={false} style={[styles.title, textDirection]}>{config.title}</Text>
                    {!!config.message && <Text allowFontScaling={false} style={[styles.message, textDirection]}>{config.message}</Text>}
                    <View style={[styles.buttons, vertical ? styles.buttonsVertical : { flexDirection: rtl ? 'row-reverse' : 'row' }]}>
                        {config.buttons.map((button, i) => (
                            <TouchableOpacity key={i} onPress={() => press(button)}
                                style={[styles.button, vertical && styles.buttonFull, button.style === 'cancel' && styles.buttonCancel]}>
                                <Text allowFontScaling={false} style={[styles.buttonText,
                                button.style === 'cancel' && styles.buttonTextCancel,
                                button.style === 'destructive' && styles.buttonTextDestructive]}>
                                    {button.text}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.4)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    box: {
        backgroundColor: '#fff',
        borderRadius: 14,
        minWidth: 270,
        maxWidth: 340,
        padding: 20,
    },
    title: {
        fontSize: 17,
        fontWeight: '600',
        color: '#000',
        marginBottom: 8,
    },
    message: {
        fontSize: 15,
        color: '#000',
        marginBottom: 20,
        lineHeight: 21,
    },
    buttons: {
        justifyContent: 'center',
        gap: 12,
    },
    buttonsVertical: {
        flexDirection: 'column',
        gap: 8,
    },
    button: {
        paddingVertical: 12,
        paddingHorizontal: 24,
        backgroundColor: '#F2F2F7',
        borderRadius: 8,
        alignItems: 'center',
        minWidth: 110,
    },
    buttonFull: {
        alignSelf: 'stretch',
    },
    buttonCancel: {
        backgroundColor: '#007AFF',
    },
    buttonText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#000',
    },
    buttonTextCancel: {
        color: '#fff',
    },
    buttonTextDestructive: {
        color: '#FF3B30',
    },
});
