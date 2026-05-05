import sharp from 'sharp';

export async function makeJpegFixture(width = 800, height = 600, withExif = false): Promise<Buffer> {
  let buf = await sharp({
    create: { width, height, channels: 3, background: { r: 80, g: 100, b: 200 } },
  }).jpeg({ quality: 90 }).toBuffer();
  if (withExif) {
    buf = await sharp(buf).withMetadata({
      exif: { IFD0: { Make: 'TEST', Model: 'fixture', Software: 'jest' } } as any,
    }).toBuffer();
  }
  return buf;
}

export async function makePngFixture(width = 400, height = 300): Promise<Buffer> {
  return sharp({
    create: { width, height, channels: 4, background: { r: 200, g: 50, b: 50, alpha: 1 } },
  }).png().toBuffer();
}
