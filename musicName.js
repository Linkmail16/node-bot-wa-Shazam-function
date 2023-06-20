import fs from 'fs';
import acrcloud from 'acrcloud';
import { exec } from 'child_process';

let acr = new acrcloud({
  host: 'identify-eu-west-1.acrcloud.com',
  access_key: 'c33c767d683f78bd17d4bd4991955d81',
  access_secret: 'bvgaIAEtADBTbLwiPGYlxupWqkNGIjT7J9Ag2vIu'
});

let handler = async (m) => {
  let q = m.quoted ? m.quoted : m;
  let mime = (q.msg || q).mimetype || '';
  if (/audio|video/.test(mime)) {
    let media = await q.download();
    let ext = mime.split('/')[1];
    fs.writeFileSync(`./tmp/${m.sender}.${ext}`, media);

    // Si es un video, lo convertimos a audio con ffmpeg
    if (mime.includes('video')) {
      let audioFilePath = `./tmp/${m.sender}.mp3`;
      let trimmedAudioFilePath = `./tmp/${m.sender}_trimmed.mp3`;

      let ffmpegCommand = `ffmpeg -i ./tmp/${m.sender}.${ext} -t 8 -vn -acodec libmp3lame ${trimmedAudioFilePath}`;

      // Ejecutamos el comando de ffmpeg para recortar el video a 8 segundos y convertirlo a audio
      exec(ffmpegCommand, async (error) => {
        if (error) {
          console.error('Error al recortar el video y convertirlo a audio:', error);
          throw 'Error al recortar el video y convertirlo a audio.';
        } else {
          // Identificar la música utilizando ACRCloud
          let res = await acr.identify(fs.readFileSync(trimmedAudioFilePath));
          let { code, msg } = res.status;
          if (code !== 0) throw msg;

          let { title, artists, album, genres, release_date } = res.metadata.music[0];
          let txt = `TITULO: *${title}*
ARTISTA: *${artists !== undefined ? artists.map(v => v.name).join(', ') : 'No encontrado'}*
ALBUM: *${album.name || 'No encontrado'}*
GENERO: *${genres !== undefined ? genres.map(v => v.name).join(', ') : 'No encontrado'}*
FECHA DE LANZAMIENTO: *${release_date || 'No encontrado'}*`.trim();

          fs.unlinkSync(trimmedAudioFilePath);
          fs.unlinkSync(`./tmp/${m.sender}.${ext}`);
          m.reply(txt);
        }
      });
    } else {
      // Identificar la música utilizando ACRCloud directamente si es un archivo de audio
      let audioFilePath = `./tmp/${m.sender}.${ext}`;
      let trimmedAudioFilePath = `./tmp/${m.sender}_trimmed.${ext}`;

      // Recortar el audio a 10 segundos
      let ffmpegCommand = `ffmpeg -i ${audioFilePath} -t 10 -c copy ${trimmedAudioFilePath}`;

      // Ejecutamos el comando de ffmpeg para recortar el audio a 10 segundos
      exec(ffmpegCommand, async (error) => {
        if (error) {
          console.error('Error al recortar el audio:', error);
          throw 'Error al recortar el audio.';
        } else {
          // Identificar la música utilizando ACRCloud
          let res = await acr.identify(fs.readFileSync(trimmedAudioFilePath));
          let { code, msg } = res.status;
          if (code !== 0) throw msg;

          let { title, artists, album, genres, release_date } = res.metadata.music[0];
          let txt = `TITULO: *${title}*
ARTISTA: *${artists !== undefined ? artists.map(v => v.name).join(', ') : 'No encontrado'}*
ALBUM: *${album.name || 'No encontrado'}*
GENERO: *${genres !== undefined ? genres.map(v => v.name).join(', ') : 'No encontrado'}*
FECHA DE LANZAMIENTO: *${release_date || 'No encontrado'}*`.trim();

          fs.unlinkSync(trimmedAudioFilePath);
          fs.unlinkSync(audioFilePath);
          m.reply(txt);
        }
      });
    }
  } else {
    throw 'Error, intenta responder a algo con audio o video.';
  }
};

handler.command = /^quemusica|musicname|nombremusica|shazam|shasam|chazam|chasam|name|nombre|musicanombre$/i;
export default handler;
