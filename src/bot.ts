import { existsSync, readFileSync, writeFileSync } from 'fs';
import { Client, TextChannel } from 'discord.js';
import dotenv from 'dotenv';
import axios from 'axios';
import HTMLParser from 'fast-html-parser';
import pdftopic from 'pdftopic';

type Cache = {
  dates: string[]
}

dotenv.config();

const client = new Client({
  'intents': [],
  'partials': [],
});

//起動確認
client.once('ready', async () => {
  if (!client.user) return;
  console.log(`${client.user.tag} Ready`);
  const channel = await client.channels.fetch(process.env.CHANNEL_ID || '') as TextChannel;
  if (!channel) return;

  const proc = async () => {
    try {
      const res = await axios.get('http://www.sport.edu.uec.ac.jp/info/');
      const dom = HTMLParser.parse(res.data);
      const articles = dom.querySelectorAll('article.post');
      const cache: Cache = existsSync('cache.json') ? JSON.parse(readFileSync('cache.json').toString()) : { dates: [] }
      const newCache: Cache = { dates: [] }
      for (const post of articles) {
        const title = post.querySelector('.post-title')?.text;
        if (!title?.includes('健康論')) continue;
        const date = post.querySelector('.date')?.attributes.datetime;
        if (!date) continue;
        newCache.dates.push(date);
        if (cache.dates.includes(date)) continue;
        const dateStr = post.querySelector('.date')?.text;
        const pdfUrl = post.querySelector('a.pdfemb-viewer')?.attributes.href;
        if (!pdfUrl) continue;
        const pdf = await axios.get(pdfUrl, { responseType : 'arraybuffer' });
        const images = await pdftopic.pdftobuffer(pdf.data, 'all');
        if (!images) continue;

        const files = [];
        for (let i = 0; i < images.length; i++) {
          files.push({ attachment: images[i], name: `page${i}.png` })
        }
        console.log(title, files);
        await channel.send({ content: `${dateStr}\n${title}`, files });
      }
      writeFileSync('cache.json', JSON.stringify(newCache));
    } catch (err) {
      console.error(err);
    }
  }

  await proc();
  setInterval(proc, 5*60*1000);
});


// Discordへの接続
client.login(process.env.DISCORD_TOKEN);
