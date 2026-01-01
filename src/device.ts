let gIsSimulator = false;

export function setIsSimulator(val:boolean) {
    gIsSimulator = val;
}


export function isSimulator() {
    return gIsSimulator;
}