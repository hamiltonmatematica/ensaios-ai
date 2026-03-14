import ffmpeg from "fluent-ffmpeg";
import ffmpegInstaller from "@ffmpeg-installer/ffmpeg";
import path from "path";
import fs from "fs";
import { v4 as uuidv4 } from "uuid";

// Tenta usar o ffmpeg do sistema ou o instalador (caso adicionado no futuro)
// Por enquanto, assume que o usuário instalou o ffmpeg no sistema
// ffmpeg.setFfmpegPath(ffmpegInstaller.path); // Descomentar se usar @ffmpeg-installer/ffmpeg

export async function renderVideo(
    audioPath: string,
    imagePaths: string[],
    duration: number
): Promise<string> {
    console.log("🎬 Iniciando renderização do vídeo...");

    const outputPath = path.join(process.cwd(), "public/videos", `${uuidv4()}.mp4`);

    // Garantir diretório
    if (!fs.existsSync(path.dirname(outputPath))) {
        fs.mkdirSync(path.dirname(outputPath), { recursive: true });
    }

    // Lógica simples: Imagens em slideshow + Áudio
    // Cada imagem dura (duração total / número de imagens)
    const imageDuration = duration / imagePaths.length;

    // Criar arquivo de input para o concat demuxer do ffmpeg
    const listFileName = path.join(process.cwd(), "public/temp", `${uuidv4()}.txt`);
    if (!fs.existsSync(path.dirname(listFileName))) {
        fs.mkdirSync(path.dirname(listFileName), { recursive: true });
    }

    const fileContent = imagePaths.map(img => {
        return `file '${path.join(process.cwd(), "public", img)}'\nduration ${imageDuration}`;
    }).join("\n");

    // Repete a última imagem para evitar corte bruto
    // fileContent += `\nfile '${path.join(process.cwd(), "public", imagePaths[imagePaths.length - 1])}'`;

    fs.writeFileSync(listFileName, fileContent);

    return new Promise((resolve, reject) => {
        ffmpeg()
            .input(listFileName)
            .inputOptions(['-f', 'concat', '-safe', '0'])
            .input(path.join(process.cwd(), "public", audioPath))
            .outputOptions([
                '-c:v libx264',
                '-pix_fmt yuv420p',
                '-shortest',
                '-r 30'
            ])
            .save(outputPath)
            .on('start', (commandLine) => {
                console.log('Spawned Ffmpeg with command: ' + commandLine);
            })
            .on('error', (err) => {
                console.error('Erro na renderização:', err);
                reject(err);
            })
            .on('end', () => {
                console.log('✅ Renderização concluída!');
                // Limpar arquivo temporário
                fs.unlinkSync(listFileName);
                resolve(`/videos/${path.basename(outputPath)}`);
            });
    });
}
