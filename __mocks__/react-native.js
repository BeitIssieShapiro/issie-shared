// Minimal react-native for the node-environment unit tests of issie-shared.
module.exports = {
    Platform: { OS: 'ios', select: (o) => o.ios ?? o.default },
    Linking: { openURL: jest.fn(async () => true) },
    Alert: { alert: jest.fn() },
    StyleSheet: { create: (s) => s },
};
