import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import * as cheerio from 'cheerio';

export async function POST(request: Request) {
  try {
    const { url } = await request.json();

    if (!url) {
      return NextResponse.json({ error: 'URL is required' }, { status: 400 });
    }

    let title = '';
    let thumbnailUrl = null;
    let platform = 'website';

    // Check if YouTube
    const ytRegex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/i;
    const match = url.match(ytRegex);

    if (match && match[1]) {
      const videoId = match[1];
      platform = 'youtube';
      thumbnailUrl = `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
      
      try {
        const oembedRes = await fetch(`https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`);
        if (oembedRes.ok) {
          const data = await oembedRes.json();
          title = data.title || 'YouTube Video';
        } else {
          title = 'YouTube Video';
        }
      } catch (e) {
        title = 'YouTube Video';
      }
    } else {
      // General website & Instagram scraper
      if (url.includes('instagram.com')) platform = 'instagram';
      try {
        const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36' } });
        const html = await res.text();
        const $ = cheerio.load(html);
        
        let extractedTitle = $('meta[property="og:title"]').attr('content') || $('title').text();
        let extractedDesc = $('meta[property="og:description"]').attr('content');
        
        // For Instagram, the title is often generic, so we prefer the description
        if (platform === 'instagram' && extractedDesc) {
          title = extractedDesc;
        } else {
          title = extractedTitle || url;
        }
        
        let extractedImage = $('meta[property="og:image"]').attr('content') || 
                             $('meta[property="og:image:secure_url"]').attr('content') ||
                             $('link[rel="apple-touch-icon"]').attr('href') ||
                             $('link[rel="icon"]').attr('href') || 
                             $('link[rel="shortcut icon"]').attr('href');
        
        if (extractedImage) {
          try {
            const urlObj = new URL(url);
            // Convert relative paths (like /logo.png) to absolute paths using the base URL
            thumbnailUrl = new URL(extractedImage, urlObj.origin).toString();
          } catch (err) {
            thumbnailUrl = extractedImage;
          }
        } else {
          thumbnailUrl = null;
        }
        
        // Favicon Fallback for general websites without any metadata
        if (!thumbnailUrl) {
          try {
            const urlObj = new URL(url);
            thumbnailUrl = `https://www.google.com/s2/favicons?domain=${urlObj.hostname}&sz=128`;
          } catch (err) {
            // keep null
          }
        }
      } catch (e) {
        title = url;
        try {
          const urlObj = new URL(url);
          thumbnailUrl = `https://www.google.com/s2/favicons?domain=${urlObj.hostname}&sz=128`;
        } catch (err) {}
      }
    }

    // Default category logic
    let categoryName = 'Project Ideas'; // default
    const t = (title + ' ' + url).toLowerCase();
    
    if (t.includes('dsa') || t.includes('algorithm') || t.includes('leetcode') || t.includes('data structure') || t.includes('tree')) {
      categoryName = 'DSA';
    } else if ((t.includes('java') && !t.includes('javascript')) || t.includes('spring') || t.includes('oop')) {
      categoryName = 'Java Development';
    } else if (t.includes('python') || t.includes('django') || t.includes('flask') || t.includes('machine learning') || t.includes('pandas')) {
      categoryName = 'Python Development';
    } else if (t.includes('react') || t.includes('next') || t.includes('web') || t.includes('html') || t.includes('css') || t.includes('javascript') || t.includes('frontend') || t.includes('backend')) {
      categoryName = 'Web Development';
    } else if (t.includes('music') || t.includes('song') || t.includes('lofi') || t.includes('mix')) {
      categoryName = 'Music';
    } else if (t.includes('tutorial') || t.includes('course') || t.includes('learn') || t.includes('how to')) {
      categoryName = 'Tutorials';
    } else if (t.includes('instagram') || t.includes('reel') || t.includes('tiktok') || t.includes('shorts')) {
      categoryName = 'Social Media';
    }

    // Upsert Category
    const category = await prisma.category.upsert({
      where: { name: categoryName },
      update: {},
      create: {
        name: categoryName,
        slug: categoryName.toLowerCase().replace(/\s+/g, '-')
      }
    });

    const item = await prisma.item.create({
      data: {
        url,
        title: title || 'Untitled',
        thumbnailUrl,
        platform,
        categoryId: category.id,
      }
    });

    return NextResponse.json(item, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}
