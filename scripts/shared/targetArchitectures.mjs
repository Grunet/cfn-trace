
function getTargetArchitectures() {
    return [
        "x86_64-unknown-linux-gnu", 
        "x86_64-pc-windows-msvc", 
        "x86_64-apple-darwin", 
        "aarch64-apple-darwin"
    ];
}

export { getTargetArchitectures }