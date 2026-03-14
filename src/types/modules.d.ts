declare module 'get-mp3-duration' {
    export default function getMP3Duration(buffer: Buffer): number;
}

declare module '@ffmpeg-installer/ffmpeg' {
    const ffmpeg: { path: string; version: string; url: string; };
    export default ffmpeg;
}

declare module '@ffprobe-installer/ffprobe' {
    const ffprobe: { path: string; version: string; url: string; };
    export default ffprobe;
}
