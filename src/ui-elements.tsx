import React from 'react';
import { ColorValue, GestureResponderEvent, Text, TextStyle, TouchableOpacity, View, ViewStyle } from "react-native";
import { getRowDirection, isRTL } from "./lang";
import { IconType, MyIcon } from "./icons";
import { AppColors } from "./styles";

const uiSettings = {
    showButtonTexts: true,

};

export function updateUISettings(showButtonTexts: boolean) {
    uiSettings.showButtonTexts = showButtonTexts;
}

export function getFont() {
    return isRTL() ? 'Alef' : 'Verdana';
}

export function getFontFamily() {
    return { fontFamily: getFont() }
}

interface AppTextProps {
    ellipsizeMode?: boolean;
    style?: TextStyle;
    onPress?: ((event: GestureResponderEvent) => void) | undefined;
    children: any;
}
export function AppText({ style, ellipsizeMode, onPress, children }: AppTextProps) {

    const moreProps = ellipsizeMode ? ({
        numberOfLines: 1,
        ellipsizeMode: "tail"
    } as { numberOfLines: Number, ellipsizeMode: "tail" }) : {}

    return (
        <Text allowFontScaling={false}
            style={[{
                fontFamily: getFont(),
                fontSize: 24,
                textAlign: isRTL() ? 'right' : 'left',

            }, style]}
            onPress={onPress}

            {...moreProps}
        >{children}</Text>
    );
}

interface RoundedButtonProps {
    onPress: () => void;
    icon: React.ReactNode; // a string or a jsx elem
    text: string;
    textSize: number;
    iconSize: number;
    size: { width: number, height: number };
    direction?: "row" | "row-reverse";
    dark?: boolean;
    key?: string;
    iconType?: IconType;
    isMobile?: boolean;
    forceText?: string;
}
export function RoundedButton({ onPress, icon, text, textSize, iconSize,
    size, direction, dark, isMobile, forceText, key, iconType }: RoundedButtonProps) {

    if (uiSettings.showButtonTexts && !isMobile || forceText) {
        return getRoundedButtonInt(onPress, icon, text, textSize, iconSize, size, direction, dark, key, iconType)
    } else {
        return getRoundedButtonInt(onPress, icon, "", textSize, iconSize, size, direction, dark, key, iconType)
    }
}

export function getRoundedButtonInt(
    callback: () => void,
    icon: React.ReactNode, // a string or a jsx elem
    text: string,
    textSize: number,
    iconSize: number,
    size: { width: number, height: number },
    direction?: "row" | "row-reverse",
    dark?: boolean,
    key?: string,
    iconType?: IconType) {

    let color = dark ? "white" : AppColors.titleText;
    if (icon === 'check-green') {
        color = 'green';
        icon = 'check';
    } else if (icon == 'cancel-red') {
        color = 'red';
        icon = 'close';
    }

    let textExist = text && text.length > 0;
    const activeDirection = direction ? direction : getRowDirection();
    const textAlign = icon ? (activeDirection == "row" ? "right" : "left") : "center";

    return <TouchableOpacity
        key={key}
        activeOpacity={0.7}
        onPress={callback}
        style={{ ...size }}
    >
        <View
            style={{
                flex: 1,
                zIndex: 6,
                borderRadius: 25,
                alignItems: 'center',
                alignContent: 'center',
                padding: 5,
                justifyContent: textExist ? 'flex-end' : 'center',
                backgroundColor: dark ? '#808080' : '#eeeded',
                flexDirection: activeDirection,
            }}>
            {textExist ?
                <AppText style={{
                    marginEnd: (isRTL() ? 5 : 0), marginStart: (isRTL() ? 0 : 5),
                    width: icon ? '80%' : '100%',
                    fontSize: textSize,
                    lineHeight: textSize + (isRTL() ? 5 : 0),
                    color: dark ? "white" : AppColors.titleText,
                    textAlign
                }}>{text}</AppText> : null
            }
            {React.isValidElement(icon) ?
                icon
                : (icon && <MyIcon info={{ name: icon as string, size: iconSize, color, type: iconType }} />)
            }
        </View>
    </TouchableOpacity>
}

interface SpacerProps {
    h?: number | string;
    w?: number | string;
    bc?: ColorValue; // Better than 'string' for React Native colors
}
export function Spacer({ h, w, bc }: SpacerProps) {
    return <View style={{ height: h, width: w, backgroundColor: bc } as ViewStyle} />
}
